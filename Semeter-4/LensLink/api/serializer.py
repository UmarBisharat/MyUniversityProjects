from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Job
from django.utils import timezone
from .models import Profile, PortfolioMedia, Order, Review, Application

class RegisterSerializer(serializers.ModelSerializer):
    ROLE_CHOICES = [
        ('Freelancer', 'Freelancer'),
        ('Client', 'Client'),
    ]
    role = serializers.ChoiceField(choices=ROLE_CHOICES, default='Freelancer')
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True, 'max_length': 16}}

    def validate_email(self, value):
        if not value.endswith('@students.muet.edu.pk') and not value.endswith('@faculty.muet.edu.pk'):
            raise serializers.ValidationError("Email must be a muet email address")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def create(self, validated_data):
        role = validated_data.pop('role', 'Freelancer')
        user = User.objects.create_user(
            **validated_data
        )
        Profile.objects.create(user=user, role=role, full_name=user.username)
        return user

class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = '__all__'
        extra_kwargs = {'client': {'read_only': True}}

    
    def validate_deadline(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Deadline cannot be in the past")
        return value

    def validate(self, data):
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            if request.user.profile.role != 'Client':
                raise serializers.ValidationError("Only users with the 'Client' role can post jobs.")
        return data

class PortfolioMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioMedia
        fields = '__all__'
        extra_kwargs = {'profile': {'read_only': True}}
    
    def validate(self, data):
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            if request.user.profile.role != 'Freelancer':
                raise serializers.ValidationError("Only users with the 'Freelancer' role can post portfolios.")
        return data
    
class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'
        extra_kwargs = {
            'client': {'read_only': True},
            'payment_proof': {'write_only': True}
        }
    def validate(self, data):
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            if request.user.profile.role != 'Client':
                raise serializers.ValidationError("Only users with the 'Client' role can post orders.")
        return data

class PaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['payment_proof', 'transaction_id']
        extra_kwargs = {
            'payment_proof': {'required': True},
            'transaction_id': {'required': True}
        }

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'
        extra_kwargs = {
            'reviewer': {'read_only': True},
            'reviewee': {'read_only': True}
        }
    def validate(self, data):
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            if request.user.profile.role != 'Client':
                raise serializers.ValidationError("Only users with the 'Client' role can post reviews.")
        return data

class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = '__all__'
        extra_kwargs = {
            'freelancer': {'read_only': True},
            'job': {'read_only': True}
        }
    def validate(self, data):
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            if request.user.profile.role != 'Freelancer':
                raise serializers.ValidationError("Only users with the 'Freelancer' role can apply for jobs.")
        return data

class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'
        extra_kwargs = {'user': {'read_only': True}}