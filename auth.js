const SUPABASE_URL = "https://oevtmsoshnxshtmtdezb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ibo6HlJi-WSYVcsAi-nv_Q_IK0fOfMy";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


const signinTab = document.getElementById("signinTab");
const signupTab = document.getElementById("signupTab");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authButton = document.getElementById("authButton");
const authMessage = document.getElementById("authMessage");
const continueGuest = document.getElementById("continueGuest");

let authMode = "signin";

function showSignIn() {
  authMode = "signin";
  signinTab.classList.add("active");
  signupTab.classList.remove("active");
  authButton.textContent = "SIGN IN";
  passwordInput.setAttribute("autocomplete", "current-password");
  clearMessage();
}

function showSignUp() {
  authMode = "signup";
  signupTab.classList.add("active");
  signinTab.classList.remove("active");
  authButton.textContent = "CREATE ACCOUNT";
  passwordInput.setAttribute("autocomplete", "new-password");
  clearMessage();
}

function showMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function clearMessage() {
  authMessage.textContent = "";
  authMessage.className = "auth-message";
}

function setLoading(loading) {
  authButton.disabled = loading;

  if (loading) {
    authButton.textContent = authMode === "signin"
      ? "SIGNING IN..."
      : "CREATING ACCOUNT...";
  } else {
    authButton.textContent = authMode === "signin"
      ? "SIGN IN"
      : "CREATE ACCOUNT";
  }
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) throw error;

  return data;
}

async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password
  });

  if (error) throw error;

  return data;
}

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
        window.location.href = "index.html";
      }, 700);
    } else {
      const data = await signUp(email, password);

      if (data.session) {
        showMessage("ACCOUNT CREATED. OPENING DATABASE...", "success");

        setTimeout(() => {
          window.location.href = "index.html";
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

continueGuest.addEventListener("click", () => {
  window.location.href = "index.html";
});

async function checkExistingSession() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    window.location.href = "index.html";
  }
}

checkExistingSession();