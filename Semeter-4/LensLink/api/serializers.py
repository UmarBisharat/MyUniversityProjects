from rest_framework import serializers
from django.contrib.auth.models import User
import uuid
from django.conf import settings
from .models import Profile, PortfolioMedia, Job, Order, Review, Conversation, Message, Application
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone


class PortfolioMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioMedia
        fields = ['id', 'file', 'media_type']

class ProfileSerializer(serializers.ModelSerializer):
    portfolio_media = PortfolioMediaSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    reviews_count = serializers.SerializerMethodField()
    reputation_points = serializers.IntegerField(read_only=True)
    unread_messages_count = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    completion_rate = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()
    total_earnings = serializers.SerializerMethodField()
    portfolio_link = serializers.URLField(required=False, allow_blank=True)


    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            return request.user.profile.id == obj.id
        return False

    def get_unread_messages_count(self, obj):
        return Message.objects.filter(conversation__participants=obj, read=False).exclude(sender=obj).count()

    def get_avg_rating(self, obj):
        reviews = obj.reviews_received.all()
        if not reviews.exists():
            return None
        total = sum(r.rating for r in reviews)
        return round(total / reviews.count(), 1)

    def get_reviews_count(self, obj):
        return obj.reviews_received.count()

    def get_completion_rate(self, obj):
        # Only count orders where freelancer was involved and work was expected
        total = obj.orders_received.exclude(status__in=['Pending Payment', 'Confirmation Pending', 'Payment Rejected']).count()
        if total == 0:
            return None
        completed = obj.orders_received.filter(status='Completed').count()
        return round((completed / total) * 100)

    def get_total_earnings(self, obj):
        from django.db.models import Sum
        total = obj.orders_received.filter(status__in=['Active', 'Work Submitted', 'Completed']).aggregate(Sum('amount'))['amount__sum']
        return float(total) if total else 0.0
        
    def validate_pricing(self, value):
        try:
            return float(value)
        except:
            raise serializers.ValidationError("Invalid pricing format")
            
    def validate_is_completed(self, value):
        return str(value).lower() == 'true'
        
    def validate_portfolio_link(self, value):
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("Portfolio link must start with http:// or https://")
        return value

    class Meta:
        model = Profile
        fields = [
            'id', 'user', 'user_email', 'role', 'name', 'profile_pic', 
            'headline', 'department', 'skills', 'experience', 
            'stipend', 'bank_account', 'account_name', 'company_name', 'project_type', 'budget_range',
            'portfolio_media', 'saved_freelancers', 'unread_messages_count',
            'is_verified', 'is_me', 'avg_rating', 'completion_rate', 'reviews_count', 'reputation_points', 'total_earnings', 'is_completed', 'is_banned',
            # NEW
            'bio',
            'photography_types',
            'experience_level',
            'location',
            'portfolio_link',
            'pricing'
        ]



class RegisterSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=Profile.ROLE_CHOICES, write_only=True)
    name = serializers.CharField(max_length=255, write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'role', 'name')
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists() or User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        role = validated_data['role']
        name = validated_data['name']

        # User is already verified via OTP before this call
        Profile.objects.create(user=user, role=role, name=name, is_verified=True)
        return user



    def to_representation(self, instance):
        # Return tokens and user info in the response
        refresh = RefreshToken.for_user(instance)
        profile = getattr(instance, 'profile', None)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'email': instance.email,
            'role': profile.role if profile else 'client',
            'name': profile.name if profile else instance.username
        }


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from django.contrib.auth import authenticate
from rest_framework_simplejwt.settings import api_settings

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        # The frontend sends 'email', but Django User model expects 'username' for authentication
        # We manually call authenticate with username=attrs['email']
        email = attrs.get("email")
        password = attrs.get("password")
        
        self.user = authenticate(username=email, password=password)
        
        if not self.user:
            raise serializers.ValidationError("No active account found with the given credentials")
            
        if not api_settings.USER_AUTHENTICATION_RULE(self.user):
            raise serializers.ValidationError("User account is disabled")

        # Check for ban
        profile = getattr(self.user, 'profile', None)
        if profile and profile.is_banned:
            raise serializers.ValidationError("Your account has been banned. Please contact support.")

        # Generate tokens
        refresh = self.get_token(self.user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
        
        # Add custom fields for frontend
        profile = getattr(self.user, 'profile', None)
        data['is_staff'] = self.user.is_staff
        data['email'] = self.user.email
        if profile:
            data['role'] = profile.role
            data['name'] = profile.name
        else:
            data['role'] = 'client' 
            data['name'] = self.user.username
            
        return data

class JobSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    client_email = serializers.EmailField(source='client.user.email', read_only=True)
    client_profile_pic = serializers.ImageField(source='client.profile_pic', read_only=True)
    
    class Meta:
        model = Job
        fields = [
            'id', 'client', 'client_name', 'client_email', 'client_profile_pic', 'title', 'location', 'skills_required', 
            'stipend', 'deadline', 'description', 'status', 'created_at'
        ]
        extra_kwargs = {
            'client': {'read_only': True}
        }

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            profile = Profile.objects.get(user=request.user)
            validated_data['client'] = profile
        return super().create(validated_data)



class OrderSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    freelancer_name = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    freelancer_email = serializers.SerializerMethodField()
    client_email_input = serializers.EmailField(write_only=True, required=False) # Deprecated, use token
    freelancer_email_input = serializers.EmailField(write_only=True, required=True)

    def get_client_name(self, obj):
        return obj.client.name if obj.client else "Unknown"

    def get_freelancer_name(self, obj):
        return obj.freelancer.name if obj.freelancer else "Unknown"

    def get_client_email(self, obj):
        return obj.client.user.email if obj.client and obj.client.user else "N/A"

    def get_freelancer_email(self, obj):
        return obj.freelancer.user.email if obj.freelancer and obj.freelancer.user else "N/A"

    has_review = serializers.SerializerMethodField()

    def get_has_review(self, obj):
        return hasattr(obj, 'review')

    def validate(self, attrs):
        deadline = attrs.get('deadline')
        if deadline and timezone.now().date() > deadline:
            raise serializers.ValidationError("Deadline cannot be in the past.")
        return attrs
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'client', 'client_name', 'freelancer', 'freelancer_name',
            'client_email', 'freelancer_email', 'client_email_input', 'freelancer_email_input',
            'project_name', 'shoot_type', 'location', 'requirements', 'deadline', 'amount', 'status',
            'transaction_id', 'payment_proof', 'admin_notes',
            'dispute_reason', 'dispute_raised_at', 'resolution_notes', 'resolved_at',
            'work_submission_text', 'work_submission_link', 'submitted_at',
            'created_at', 'has_review'
        ]


        extra_kwargs = {
            'order_id': {'read_only': True},
            'client': {'read_only': True},
            'freelancer': {'read_only': True},
        }


    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required")

        # SECURITY: Always use the authenticated user's profile as the client
        validated_data['client'] = request.user.profile
        
        freelancer_email = validated_data.pop('freelancer_email_input', None)
        if freelancer_email:
            validated_data['freelancer'] = Profile.objects.filter(user__email=freelancer_email).first()

        if not validated_data.get('freelancer'):
            raise serializers.ValidationError("Valid freelancer email is required")

        return super().create(validated_data)

class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.name', read_only=True)
    reviewer_email_input = serializers.EmailField(write_only=True, required=False)
    
    class Meta:
        model = Review
        fields = [
            'id', 'order', 'reviewer', 'reviewer_name', 'reviewee', 
            'rating', 'review_text', 'created_at', 'reviewer_email_input'
        ]
        extra_kwargs = {
            'reviewer': {'required': False},
            'reviewee': {'required': False}
        }


    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required")

        # SECURITY: Reviewer is always the authenticated user
        reviewer = request.user.profile
        validated_data['reviewer'] = reviewer
        
        # Pull reviewee from order
        order = validated_data.get('order')
        if not order:
            raise serializers.ValidationError("Order is required for review")

        # Ensure reviewer is part of the order
        if reviewer != order.client and reviewer != order.freelancer:
            raise serializers.ValidationError("You are not authorized to review this order")

        if not validated_data.get('reviewee'):
            # If client reviews, reviewee is freelancer. If freelancer reviews, reviewee is client.
            if reviewer == order.client:
                validated_data['reviewee'] = order.freelancer
            else:
                validated_data['reviewee'] = order.client
                
        return super().create(validated_data)



class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    sender_email = serializers.EmailField(source='sender.user.email', read_only=True)
    is_me = serializers.SerializerMethodField()
    
    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            return request.user.profile.id == obj.sender_id
        return False
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_email', 'sender_name', 'text', 'timestamp', 'read', 'is_me']
        extra_kwargs = {
            'sender': {'read_only': True}
        }



class ConversationSerializer(serializers.ModelSerializer):
    participants = ProfileSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    participant_emails = serializers.ListField(
        child=serializers.EmailField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Conversation
        fields = ['id', 'name', 'participants', 'created_at', 'messages', 'participant_emails']


class ApplicationSerializer(serializers.ModelSerializer):
    freelancer_name = serializers.CharField(source='freelancer.name', read_only=True)
    freelancer_email = serializers.EmailField(source='freelancer.user.email', read_only=True)
    freelancer_email_input = serializers.EmailField(write_only=True, required=False)
    freelancer_portfolio = serializers.URLField(source='freelancer.portfolio_link', read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)


    class Meta:
        model = Application
        fields = ['id', 'job', 'job_title', 'freelancer', 'freelancer_name', 'freelancer_email', 'freelancer_email_input', 'freelancer_portfolio', 'cover_letter', 'status', 'applied_at']

        extra_kwargs = {
            'freelancer': {'read_only': True}
        }

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required")

        # SECURITY: Freelancer is always the authenticated user
        validated_data['freelancer'] = request.user.profile
        return super().create(validated_data)
