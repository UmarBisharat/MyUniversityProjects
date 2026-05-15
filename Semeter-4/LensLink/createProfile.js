let currentStep = 1;
const totalSteps = 10;

let profileData = {
  name: '',
  department: '',
  bio: '',
  photography_types: '',
  experience: '',
  location: '',
  portfolio: '',
  pricing: '',
  bank_account: ''
};

document.addEventListener("DOMContentLoaded", () => {
  const profileSuccess = sessionStorage.getItem('profileSuccess');
  console.log("profileSuccess", profileSuccess);
  if (profileSuccess) {
    showToast("Profile and Portfolio Updated Successfully!", "success");
    sessionStorage.removeItem('profileSuccess');
    window.location.href = "freelancerDashboard.html";
  }
});

function getEl(id) { return document.getElementById(id); }
function getValue(id) { return getEl(id)?.value.trim() || ''; }

function showStep(step) {
  for (let i = 1; i <= totalSteps; i++) getEl(`step${i}`).classList.add('hidden');
  getEl(`step${step}`).classList.remove('hidden');
}

async function saveData(step) {
  switch (step) {
    case 1:
      profileData.name = getValue('name');
      break;

    case 3:
      profileData.department = getValue('department');
      break;

    case 4:
      profileData.bio = getValue('bio');
      break;

case 5:
  profileData.photography_types = getValue('photographyType');
  break;
  case 6:
      profileData.experience = getValue('experience');
      break;
case 7:
  profileData.location = getValue('location');
  break;

    case 8:
      profileData.portfolio = getValue('portfolio');
      break;

    case 9:
      profileData.pricing = getValue('pricing');
      break;

    case 10:
      profileData.bank_account = getValue('bankAccount');
      break;
  }
}

function validateStep(step) {
  let message = '';

  switch (step) {
    case 1:
      if (!getValue('name')) message = 'Please enter your name.';
      break;

    case 2:
      if (!getEl('profilePic')?.files[0])
        message = 'Please upload a profile picture.';
      break;

    case 3:
      if (!getValue('department'))
        message = 'Please select your department.';
      break;

    case 4:
      if (!getValue('bio'))
        message = 'Please write a short bio.';
      break;

case 5:
  if (!getValue('photographyType'))
    message = 'Please select a photography type.';
  break;
 case 6:
      if (!getValue('experience'))
        message = 'Please select experience level.';
      break;
case 7:
  if (!getValue('location'))
    message = 'Please select a location.';
  break;
    case 8:
      if (!getValue('portfolio'))
        message = 'Enter your portfolio link.';
      break;

    case 9:
      if (!getValue('pricing'))
        message = 'Enter your pricing.';
      break;

    case 10:
      if (!getValue('bankAccount'))
        message = 'Enter your bank account number.';
      break;
    case 11:
      if (!getValue('accountTitle'))
        message = 'Enter your account title.';
      break;
  }

  if (message) {
    showToast(message, "warning");
    return false;
  }
  return true;
}
async function nextStep(step) {
  if (!validateStep(step)) return;
  await saveData(step);
  if (step < totalSteps) { currentStep = step + 1; showStep(currentStep); }
}

function prevStep(step) { if (step > 1) { currentStep = step - 1; showStep(currentStep); } }

async function createProfile() {
  if (!validateStep(10)) return;
  await saveData(10);

  const btn = document.querySelector("#step10 button");
  const originalText = btn.innerText;

  const token = localStorage.getItem("access_token");
  const userEmail = localStorage.getItem("loggedInUser");

  if (!token || !userEmail) {
    showToast("You need to login first.", "error");
    window.location.href = "login.html";
    return;
  }

  // Effect: Show loading
  btn.innerText = "Finalizing Profile...";
  btn.disabled = true;

  const formData = new FormData();

  // Clean up profileData and append
  formData.append('name', profileData.name);
  formData.append('department', profileData.department);
formData.append('bio', profileData.bio);
formData.append('photography_types', profileData.photography_types);
formData.append('experience_level', profileData.experience);
formData.append('location', profileData.location);
formData.append('portfolio_link', profileData.portfolio);
formData.append('pricing', profileData.pricing);
formData.append('bank_account', profileData.bank_account);
formData.append('account_title', profileData.account_title);
  formData.append('is_completed', 'true'); // MARK AS COMPLETED

  // Append profile picture
  const pic = getEl('profilePic')?.files[0];
  if (pic) formData.append('profile_pic', pic);

  try {
    // Use PATCH because registration already created the profile object
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/profiles/me/`, {
      method: "PATCH",
      headers: {
        "Authorization": "Bearer " + token,
      },
      body: formData
    });

    if (response.ok) {
      const updatedProfile = await response.json();

      sessionStorage.setItem('profileSuccess', true);
      window.location.href = "freelancerDashboard.html";

    } else {
      const errors = await response.json();
      showToast("Error creating profile: " + JSON.stringify(errors.error || errors), "error");
      btn.innerText = originalText;
      btn.disabled = false;
    }
  } catch (err) {
    showToast("Network error during profile creation.", "error");
    console.error(err);
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

showStep(1);
