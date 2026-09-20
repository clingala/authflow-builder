import { authFlowConfigSchema, type AuthFlowConfig } from "./schema";

export type AuthFlowDefaultsInput = { appName: string; accountType: string };

export function createDefaultAuthFlowConfig(input: AuthFlowDefaultsInput): AuthFlowConfig {
  return authFlowConfigSchema.parse({
    schemaVersion: 1,
    app: { name: input.appName, accountType: input.accountType },
    labels: {
      loginTitle: `${input.accountType} Login`,
      loginAction: "Sign In",
      signupTitle: `Create ${input.accountType} Account`,
      signupAction: "Create Account",
      recoveryLink: "Forgot Password?",
      recoveryTitle: "Reset Password",
      existingAccount: "Already have an account? Sign In",
      newAccount: "Need an account? Create Account",
    },
    login: {
      identifiers: ["email"],
      passwordEnabled: true,
      socialProviders: { google: false, linkedin: false, facebook: false },
    },
    registration: {
      description: `Create your ${input.accountType.toLowerCase()} account.`,
      socialSignup: false,
      fields: [
        {
          id: "full_name",
          label: "Full Name",
          type: "text",
          required: true,
          width: "full",
          autocomplete: "name",
          validation: { minLength: 2, maxLength: 100, patternPreset: "person_name" },
        },
        {
          id: "email",
          label: "Email Address",
          type: "email",
          required: true,
          width: "full",
          autocomplete: "email",
          validation: { maxLength: 254, patternPreset: "email" },
        },
        {
          id: "password",
          label: "Password",
          type: "password",
          required: true,
          width: "full",
          autocomplete: "new-password",
          validation: { minLength: 12, maxLength: 128 },
        },
        {
          id: "confirm_password",
          label: "Confirm Password",
          type: "password",
          required: true,
          width: "full",
          autocomplete: "new-password",
        },
      ],
    },
    verification: {
      email: { enabled: false, method: "link" },
      phone: { enabled: false, method: "sms_otp" },
      otp: { ttlSeconds: 600, resendCooldownSeconds: 60, maxAttempts: 5, maxResends: 5 },
    },
    passwordPolicy: {
      minLength: 12,
      maxLength: 128,
      requireUppercase: false,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: false,
      requireConfirmation: true,
      showStrength: true,
    },
    recovery: { enabled: true, methods: ["email_link"] },
    branding: {
      primaryColor: "#173D31",
      backgroundColor: "#F4F7F3",
      surfaceColor: "#FFFFFF",
      textColor: "#15211C",
      borderRadius: 12,
      spacing: "comfortable",
      fontFamily: "system",
      fieldArrangement: "single_column",
    },
    redirects: { afterLogin: "/", afterSignup: "/", afterLogout: "/" },
    messages: {
      invalidCredentials: "The email or password is incorrect.",
      verificationRequired: "Please verify your account before continuing.",
      accountCreated: "Your account has been created.",
      recoverySent: "If an account matches those details, recovery instructions will be sent.",
      networkError: "We could not complete the request. Please try again.",
    },
  });
}

