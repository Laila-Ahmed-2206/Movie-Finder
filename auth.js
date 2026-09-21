// Authentication setup for the login page.
// This connects the front-end form to Supabase, handles sign-in, sign-up,
// + existing session detection for the app.
const SUPABASE_URL = "https://oevtmsoshnxshtmtdezb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ibo6HlJi-WSYVcsAi-nv_Q_IK0fOfMy";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const signinTab = document.getElementById("signinTab");
const signupTab = document.getElementById("signupTab");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authButton = document.getElementById("authButton");
const authMessage = document.getElementById("authMessage");
const continueGuest = document.getElementById("continueGuest");

// Tracks whether the user is signing in or creating a new account.
let authMode = "signin";

// Switches the form to the sign-in view and updates button text and autocomplete behavior.
function showSignIn() {
  authMode = "signin";
  signinTab.classList.add("active");
  signupTab.classList.remove("active");
  authButton.textContent = "SIGN IN";
  passwordInput.setAttribute("autocomplete", "current-password");
  clearMessage();
}

// Switches the form to sign-up mode and changes the user prompt to account creation.
function showSignUp() {
  authMode = "signup";
  signupTab.classList.add("active");
  signinTab.classList.remove("active");
  authButton.textContent = "CREATE ACCOUNT";
  passwordInput.setAttribute("autocomplete", "new-password");
  clearMessage();
}

// Displays a status message under the auth form, with a CSS class for success or error styling.
function showMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

// Clears the current status message when switching tabs or retrying a request.
function clearMessage() {
  authMessage.textContent = "";
  authMessage.className = "auth-message";
}

// Disables the submit button while the auth request is in progress and updates its label.
function setLoading(loading) {
  authButton.disabled = loading;
  if (loading) {
    authButton.textContent = authMode === "signin" ? "SIGNING IN..." : "CREATING ACCOUNT...";
  } else {
    authButton.textContent = authMode === "signin" ? "SIGN IN" : "CREATE ACCOUNT";
  }
}

// Calls Supabase to authenticate an existing user with their email and password.
async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email, password: password
  });
  if (error) throw error;
  return data;
}

// Creates a new user account through Supabase and returns the session if it was created.
async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: email, password: password
  });
  if (error) throw error;
  return data;
}

// Handles the login form submission, validates the fields, and routes to the correct auth action.
authForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    showMessage("Please enter your email and password.", "error");
    return;
  }
  if (password.length < 6) {
    showMessage("Password must contain at least 6 characters.", "error");
    return;
  }
  clearMessage();
  setLoading(true);
  try {
    if (authMode === "signin") {
      await signIn(email, password);
      showMessage("LOGIN SUCCESSFUL. OPENING DATABASE...", "success");
      setTimeout(() => {
        window.location.href = "movie.html";
      }, 700);
    } else {
      const data = await signUp(email, password);
      if (data.session) {
        showMessage("ACCOUNT CREATED. OPENING DATABASE...", "success");
        setTimeout(() => {
          window.location.href = "movie.html";
        }, 700);
      } else {
        showMessage("ACCOUNT CREATED. CHECK YOUR EMAIL TO CONFIRM YOUR ACCOUNT.", "success");
      }
    }
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Something went wrong.", "error");
  } finally {
    setLoading(false);
  }
});

signinTab.addEventListener("click", showSignIn);
signupTab.addEventListener("click", showSignUp);
// Lets a user skip authentication and continue using the app without an account.
continueGuest.addEventListener("click", () => {
    window.location.href = "movie.html";
});

// Intentionally disabled so the login screen always appears on launch,
// even for users who already have a Supabase session.
async function checkExistingSession() {
  return;
}

// No automatic redirect on page load.
