from django.db import models
from django.contrib.auth.models import User
import uuid

class Profile(models.Model):
    ROLE_CHOICES = [('client', 'Client'), ('freelancer', 'Freelancer')]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    name = models.CharField(max_length=255)
    profile_pic = models.ImageField(upload_to='profiles/', null=True, blank=True)
    
    # Freelancer specific fields
    headline = models.CharField(max_length=255, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    skills = models.JSONField(default=list, blank=True) # Array of skills
    bio = models.TextField(null=True, blank=True)
    photography_types = models.CharField(max_length=255, null=True, blank=True)
    experience_level = models.CharField(max_length=100, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    portfolio_link = models.URLField(max_length=500, null=True, blank=True)
    pricing = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    experience = models.TextField(null=True, blank=True)
    stipend = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    bank_account = models.CharField(max_length=100, null=True, blank=True)
    account_name = models.CharField(max_length=100, null=True, blank=True)
    
    # Client specific fields
    company_name = models.CharField(max_length=255, null=True, blank=True)
    project_type = models.CharField(max_length=255, null=True, blank=True)
    budget_range = models.CharField(max_length=255, null=True, blank=True)
    saved_freelancers = models.JSONField(default=list, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=100, null=True, blank=True)
    reputation_points = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.role})"

class PortfolioMedia(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='portfolio_media')
    file = models.FileField(upload_to='portfolio/') # Can hold images or videos
    media_type = models.CharField(max_length=10, choices=[('image', 'Image'), ('video', 'Video')])

class Job(models.Model):
    STATUS_CHOICES = [('Open', 'Open'), ('In Progress', 'In Progress'), ('Closed', 'Closed'), ('Completed', 'Completed')]
    
    client = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='jobs_posted', null=True, blank=True)
    title = models.CharField(max_length=255)
    location = models.CharField(max_length=255, null=True, blank=True)
    skills_required = models.JSONField(default=list)
    stipend = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    def __str__(self):
        return self.title

class Order(models.Model):
    STATUS_CHOICES = [
        ('Pending Payment', 'Pending Payment'),
        ('Confirmation Pending', 'Confirmation Pending'),
        ('Active', 'Active'),
        ('Work Submitted', 'Work Submitted'),
        ('Revision Requested', 'Revision Requested'),
        ('Payment Rejected', 'Payment Rejected'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
        ('Disputed', 'Disputed'),
    ]

    order_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    client = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='orders_placed', null=True, blank=True)
    freelancer = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='orders_received', null=True, blank=True)
    project_name = models.CharField(max_length=255, null=True, blank=True)
    shoot_type = models.CharField(max_length=100, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    requirements = models.TextField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending Payment')
    transaction_id = models.CharField(max_length=100, null=True, blank=True)
    payment_proof = models.ImageField(upload_to='payment_proofs/', null=True, blank=True)
    admin_notes = models.TextField(null=True, blank=True)

    # Dispute fields
    dispute_reason = models.TextField(null=True, blank=True)
    dispute_raised_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Work delivery (links only — no file storage)
    work_submission_text = models.TextField(null=True, blank=True)
    work_submission_link = models.URLField(max_length=500, null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if not self.order_id:
            self.order_id = 'SB-' + str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_id

class Review(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='reviews_given', null=True, blank=True)
    reviewee = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='reviews_received', null=True, blank=True)
    rating = models.IntegerField(null=True, blank=True)
    review_text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

class OTP(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        return f"{self.email} - {self.code}"


class Conversation(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    participants = models.ManyToManyField(Profile, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='sent_messages')
    text = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    read = models.BooleanField(default=False)

class Application(models.Model):
    STATUS_CHOICES = [('Pending', 'Pending'), ('Accepted', 'Accepted'), ('Rejected', 'Rejected')]
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    freelancer = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='job_applications')
    cover_letter = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    applied_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        unique_together = ('job', 'freelancer')

    def __str__(self):
        return f"{self.freelancer.name} -> {self.job.title}"
