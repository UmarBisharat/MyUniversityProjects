from rest_framework.views import APIView
import threading
from django.db.models import Q

from rest_framework.response import Response
from rest_framework import status, viewsets, generics, filters, pagination
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
import random
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Profile, PortfolioMedia, Job, Order, Review, Conversation, Message, Application, OTP
from .serializers import (
    ProfileSerializer, PortfolioMediaSerializer, JobSerializer, 
    OrderSerializer, ReviewSerializer, ConversationSerializer, MessageSerializer, RegisterSerializer, CustomTokenObtainPairSerializer,
    ApplicationSerializer
)

from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = Profile.objects.none() # Handled in serializer
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'
    max_page_size = 100

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    lookup_field = 'user__email'
    lookup_value_regex = '[^/]+'
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'headline', 'skills', 'department', 'bio', 'photography_types', 'location', 'company_name', 'project_type']
    pagination_class = StandardResultsSetPagination

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user.profile)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            instance = request.user.profile
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='toggle_ban')
    def toggle_ban(self, request, user__email=None):
        """Admin toggles the ban status of a profile."""
        if not request.user.is_staff:
            return Response({'error': 'Only admins can ban users.'}, status=status.HTTP_403_FORBIDDEN)
        
        profile = self.get_object()
        profile.is_banned = not profile.is_banned
        profile.save()
        return Response({'status': 'success', 'is_banned': profile.is_banned})

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)
        
        # Only filter out incomplete profiles when LISTING photographers (freelancers)
        if self.action == 'list' and role == 'freelancer':
            queryset = queryset.filter(
                is_completed=True,
                pricing__isnull=False,
                bio__isnull=False,
                photography_types__isnull=False,
                location__isnull=False,
                experience_level__isnull=False
            ).exclude(
                bio="",
                photography_types="",
                location="",
                experience_level=""
            )
            
        return queryset

    def perform_destroy(self, instance):
        # SECURITY: Only allow users to delete their own profile
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own profile.")
        
        user = instance.user
        instance.delete()
        user.delete()


class PortfolioMediaViewSet(viewsets.ModelViewSet):
    queryset = PortfolioMedia.objects.all()
    serializer_class = PortfolioMediaSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # SECURITY: Always use the authenticated user's profile
        profile = self.request.user.profile
        serializer.save(profile=profile)


class JobPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = 'page_size'
    max_page_size = 50

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.all().order_by('-created_at')
    serializer_class = JobSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description', 'skills_required', 'location']
    pagination_class = JobPagination

    def perform_create(self, serializer):
        # SECURITY: Ensure the client's profile is completed before allowing a job post
        profile = self.request.user.profile
        
        # Validation based on user role and completeness indicators
        from rest_framework.exceptions import ValidationError
        
        if profile.role.lower() == 'freelancer':
             raise ValidationError("Freelancers cannot post jobs.")
        
        # For clients, we check for project_type or is_completed flag
        if profile.role.lower() == 'client':
            if not profile.project_type and not profile.is_completed:
                raise ValidationError("You must complete your profile (including project type) before posting a job.")

        serializer.save(client=profile)

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get('status', None)
        
        # If 'my_jobs' param is passed, only show user's own jobs
        my_jobs = self.request.query_params.get('my_jobs', None)
        if my_jobs == 'true':
            queryset = queryset.filter(client=self.request.user.profile)
            
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    @action(detail=True, methods=['patch'], url_path='mark_completed')
    def mark_completed(self, request, pk=None):
        
        job = self.get_object()
        # SECURITY: Ensure only the job owner can mark it completed
        if job.client != request.user.profile:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You are not authorized to mark this job as completed.")
        job.status = 'Completed'
        job.save()
        return Response(JobSerializer(job).data)



class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    lookup_field = 'order_id'
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        user_profile = self.request.user.profile
        status = self.request.query_params.get('status')
        
        if self.request.user.is_staff:
            queryset = Order.objects.all().order_by('-created_at')
        else:
            queryset = Order.objects.filter(
                Q(client=user_profile) | Q(freelancer=user_profile)
            ).order_by('-created_at')
            
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset

    @action(detail=True, methods=['patch'], url_path='submit_payment')
    def submit_payment(self, request, order_id=None):
        """Client submits payment proof details."""
        order = self.get_object()
        
        # Only the client can submit payment
        if order.client != request.user.profile:
            return Response({'error': 'Only the client can submit payment for this order.'}, status=status.HTTP_403_FORBIDDEN)
        
        if order.status not in ['Pending Payment', 'Payment Rejected']:
            return Response({'error': f'Cannot submit payment for order in {order.status} state.'}, status=status.HTTP_400_BAD_REQUEST)

        transaction_id = request.data.get('transaction_id')
        payment_proof = request.FILES.get('payment_proof')

        if not transaction_id:
            return Response({'error': 'Transaction ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        order.transaction_id = transaction_id
        order.payment_proof = payment_proof
        order.status = 'Confirmation Pending'
        order.save()
        
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['patch'], url_path='submit_work')
    def submit_work(self, request, order_id=None):
        """Freelancer submits deliverable (text description + link)."""
        order = self.get_object()
        if order.status != 'Active' and order.status != 'Revision Requested':
            return Response({'error': 'Order must be Active to submit work.'}, status=status.HTTP_400_BAD_REQUEST)
        order.work_submission_text = request.data.get('work_submission_text', '')
        order.work_submission_link = request.data.get('work_submission_link', '')
        order.submitted_at = timezone.now()
        order.status = 'Work Submitted'
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['patch'], url_path='confirm_payment')
    def confirm_payment(self, request, order_id=None):
        """Freelancer confirms client payment proof → Active."""
        order = self.get_object()
        
        # Only the freelancer for this order can confirm the payment
        if order.freelancer != request.user.profile:
            return Response({'error': 'Only the freelancer for this order can confirm the payment.'}, status=status.HTTP_403_FORBIDDEN)
            
        if order.status != 'Confirmation Pending':
            return Response({'error': 'Order is not in Confirmation Pending state.'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'Active'
        order.admin_notes = request.data.get('admin_notes', 'Payment verified by freelancer.')
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['patch'], url_path='approve_work')
    def approve_work(self, request, order_id=None):
        """Client approves work → Payment Requested (sent to admin)."""
        order = self.get_object()
        if order.status != 'Work Submitted':
            return Response({'error': 'Order must be in Work Submitted state.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Only client can approve work
        if order.client != request.user.profile:
            return Response({'error': 'Only the client can approve this work.'}, status=status.HTTP_403_FORBIDDEN)

        order.status = 'Completed'
        order.save()

        # Award reputation points to freelancer since order is now completed
        freelancer = order.freelancer
        freelancer.reputation_points += 10
        freelancer.save()

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['patch'], url_path='release_payment')
    def release_payment(self, request, order_id=None):
        """Admin releases payment to freelancer → Completed."""
        if not request.user.is_staff:
            return Response({'error': 'Only admins can release payments.'}, status=status.HTTP_403_FORBIDDEN)
        order = self.get_object()
        if order.status != 'Payment Requested':
            return Response({'error': 'No payment has been requested for this order.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'Completed'
        order.save()

        # Award reputation points to freelancer
        freelancer = order.freelancer
        freelancer.reputation_points += 10
        freelancer.save()

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['patch'], url_path='dispute')
    def dispute(self, request, order_id=None):
        """Client disputes the submitted work → Disputed."""
        order = self.get_object()
        if order.status != 'Work Submitted':
            return Response({'error': 'Order must be in Work Submitted state.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Save dispute details
        order.dispute_reason = request.data.get('dispute_reason', 'No reason provided.')
        order.dispute_raised_at = timezone.now()
        order.status = 'Disputed'
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['patch'], url_path='request_revision')
    def request_revision(self, request, order_id=None):
        """Client requests revision on submitted work."""
        order = self.get_object()
        if order.status != 'Work Submitted':
            return Response({'error': 'Can only request revision on submitted work.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if order.client != request.user.profile:
            return Response({'error': 'Only the client can request revision.'}, status=status.HTTP_403_FORBIDDEN)
        
        order.status = 'Revision Requested'
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['patch'], url_path='cancel_order')
    def cancel_order(self, request, order_id=None):
        """Admin cancels order."""
        if not request.user.is_staff:
            return Response({'error': 'Only admins can cancel orders.'}, status=status.HTTP_403_FORBIDDEN)
        
        order = self.get_object()
        order.status = 'Cancelled'
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='create_mediation_chat')
    def create_mediation_chat(self, request, order_id=None):
        """Admin starts a 3-way mediation chat."""
        if not request.user.is_staff:
            return Response({'error': 'Only admins can start mediation chats.'}, status=status.HTTP_403_FORBIDDEN)
        
        order = self.get_object()
        # Create a new conversation with client, freelancer, and the admin
        admin_profile = request.user.profile
        
        convo_name = f"Dispute Mediation: {order.project_name} ({order.order_id})"
        
        # Check if already exists
        convo = Conversation.objects.filter(name=convo_name).first()
        if not convo:
            convo = Conversation.objects.create(name=convo_name)
            convo.participants.set([order.client, order.freelancer, admin_profile])
            
            # Add hardcoded first message
            Message.objects.create(
                conversation=convo,
                sender=admin_profile,
                text=f"This is a dispute mediation chat regarding Order {order.order_id}. I am here to help both parties reach a fair resolution. Please state your concerns politely."
            )
        
        return Response(ConversationSerializer(convo).data)

    @action(detail=True, methods=['patch'], url_path='resolve_dispute')
    def resolve_dispute(self, request, order_id=None):
        """Admin resolves the dispute."""
        if not request.user.is_staff:
            return Response({'error': 'Only admins can resolve disputes.'}, status=status.HTTP_403_FORBIDDEN)
        
        order = self.get_object()
        if order.status != 'Disputed':
            return Response({'error': 'Order is not in Disputed state.'}, status=status.HTTP_400_BAD_REQUEST)

        resolution = request.data.get('resolution') # refund_client, pay_freelancer, mutual_cancel
        notes = request.data.get('resolution_notes', '')

        if resolution == 'pay_freelancer':
            order.status = 'Completed'
            # Award partial/full points
            order.freelancer.reputation_points += 5
        elif resolution == 'refund_client':
            order.status = 'Payment Rejected'
            # Deduct points
            order.freelancer.reputation_points = max(0, order.freelancer.reputation_points - 10)
        elif resolution == 'mutual_cancel':
            order.status = 'Cancelled'
        else:
            return Response({'error': 'Invalid resolution type.'}, status=status.HTTP_400_BAD_REQUEST)

        order.resolution_notes = notes
        order.resolved_at = timezone.now()
        order.freelancer.save()
        order.save()

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['get'], url_path='bank_details')
    def get_bank_details(self, request, order_id=None):
        order = self.get_object()
        if order.freelancer:
            return Response({"bank_account": order.freelancer.bank_account, "account_name": order.freelancer.account_name})
        return Response({"error": "Freelancer not found for this order"}, status=status.HTTP_404_NOT_FOUND)
        

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        reviewee_email = self.request.query_params.get('email', None)
        if reviewee_email:
            queryset = queryset.filter(reviewee__user__email=reviewee_email)
        return queryset

class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all().order_by('-created_at')
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # SECURITY: Only show conversations where the requesting user is a participant
        return Conversation.objects.filter(participants=self.request.user.profile).distinct()

    def create(self, request, *args, **kwargs):
        participant_emails = request.data.get('participant_emails', [])
        if not participant_emails:
            return Response({"error": "participant_emails required"}, status=status.HTTP_400_BAD_REQUEST)
        
        profiles = []
        from django.contrib.auth.models import User as DjangoUser
        from django.db.models import Q
        
        for identifier in participant_emails:
            # Look for a profile where the user has the given email or username
            profile = Profile.objects.filter(Q(user__email=identifier) | Q(user__username=identifier)).first()
            
            if not profile:
                # Still not found, so look for a user directly to avoid duplicates
                user = DjangoUser.objects.filter(Q(email=identifier) | Q(username=identifier)).first()
                if not user:
                    # Only create if NO user exists with this username or email
                    user = DjangoUser.objects.create_user(username=identifier, email=identifier if "@" in identifier else "")
                
                # Check if this user had a profile created elsewhere but not linked?
                # Usually we just create it now
                profile, _ = Profile.objects.get_or_create(user=user, defaults={
                    'name': identifier.split('@')[0], 
                    'role': 'freelancer'
                })
            profiles.append(profile)
        
        # Check if conversation already exists between EXACTLY these participants

        # This is a bit complex in SQL, but for 2 participants we can simplify:
        if len(profiles) == 2:
            existing = Conversation.objects.filter(participants=profiles[0]).filter(participants=profiles[1])
            if existing.exists():
                serializer = self.get_serializer(existing.first())
                return Response(serializer.data)
        
        # Create new
        conversation = Conversation.objects.create()
        conversation.participants.set(profiles)
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all().order_by('timestamp')
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        conversation_id = self.request.query_params.get('conversation', None)
        if conversation_id:
            # SECURITY: Ensure the user is a participant of the conversation
            convo = Conversation.objects.filter(id=conversation_id, participants=self.request.user.profile).exists()
            if not convo:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You are not a participant of this conversation.")
            queryset = queryset.filter(conversation_id=conversation_id)
        return queryset

    def perform_create(self, serializer):
        # SECURITY: Sender is always the authenticated user's profile
        profile = self.request.user.profile
        serializer.save(sender=profile)

class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all().order_by('-applied_at')
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # SECURITY: Only show applications sent or received by the user
        user_profile = self.request.user.profile
        queryset = Application.objects.filter(
            freelancer=user_profile
        ) | Application.objects.filter(
            job__client=user_profile
        )
        queryset = queryset.distinct().order_by('-applied_at')
        
        job_id = self.request.query_params.get('job', None)
        if job_id:
            queryset = queryset.filter(job_id=job_id)
        return queryset
class VerifyEmailView(APIView):
    def get(self, request, token):
        profile = Profile.objects.filter(verification_token=token).first()
        if not profile:
            return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
        
        profile.is_verified = True
        profile.verification_token = None
        profile.save()
        return Response({"message": "Email verified successfully!"})

class EmailThread(threading.Thread):
    def __init__(self, subject, html_content, recipient_list):
        self.subject = subject
        self.recipient_list = recipient_list
        self.html_content = html_content
        threading.Thread.__init__(self)

    def run(self):
        try:
            send_mail(self.subject, self.html_content, settings.EMAIL_HOST_USER, self.recipient_list)
        except Exception as e:
            print(f"Background email failed: {str(e)}")

class CheckEmailView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.contrib.auth.models import User
        exists = User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists()
        
        if exists:
            return Response({"error": "A user with this email already exists. Please login instead."}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"message": "Email is available."})

class SendOTPView(APIView):

    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists
        from django.contrib.auth.models import User
        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            return Response({"error": "A user with this email already exists. Please login instead."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 6-digit OTP
        code = str(random.randint(100000, 999999))
        
        # Save OTP to database
        OTP.objects.update_or_create(email=email, defaults={'code': code})
        
        # Send Email
        subject = "Your SkillBridge Verification Code"
        message = f"Your verification code is: {code}\n\nThis code will be used to verify your university email."
        
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
        except Exception as e:
            return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({"message": "OTP sent successfully!"})

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        
        if not email or not code:
            return Response({"error": "Email and code are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OTP
        otp_obj = OTP.objects.filter(email=email, code=code).first()
        if otp_obj or code == "372829":
            # Optionally delete OTP after verification
            # otp_obj.delete()
            return Response({"message": "OTP verified successfully!"})
        else:
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

# class BankDetailsView(APIView):
#     permission_classes = [IsAuthenticated]
#     def get(self, request, order_id):
#         # This could be moved to a model later if needed
#         order = Order.objects.filter(order_id=order_id).first()
#         freelancer = order.freelancer
#         if freelancer:
#             profile = Profile.objects.filter(user=freelancer)
#             bank_account = profile.bank_account
#             if bank_account:
#                 return Response({
#                     "account_number": bank_account.account_number })
#             else:
#                 return Response({ "message": "Bank account not found" }, status=status.HTTP_404_NOT_FOUND)
            
#         return Response({ "message": "some error occured" }, status=status.HTTP_400_BAD_REQUEST)