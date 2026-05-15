from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProfileViewSet, PortfolioMediaViewSet, JobViewSet, 
    OrderViewSet, ReviewViewSet, ConversationViewSet, MessageViewSet, RegisterView, CustomTokenObtainPairView,
    ApplicationViewSet, VerifyEmailView, CheckEmailView, SendOTPView, VerifyOTPView
)

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'portfolio-media', PortfolioMediaViewSet, basename='portfolio-media')
router.register(r'jobs', JobViewSet, basename='job')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'applications', ApplicationViewSet, basename='application')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('verify-email/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('check-email/', CheckEmailView.as_view(), name='check-email'),
    path('send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('', include(router.urls)),
]
