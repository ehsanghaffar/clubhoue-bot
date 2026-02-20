export interface Application {
  apiRoot?: string;
  userAgent?: string;
  userAgentStatic?: string;
  appVersion?: string;
  appBuild?: string;
  agoraKey?: string;
  pubnubRoot?: string;
  pubnubPubKey?: string;
  pubnubSubKey?: string;
  pubnubSDK?: string;
  acceptEncodings?: string;
  languages?: string;
  locale?: string;
  acceptLanguages?: string;
}

export interface Debug {
  success?: boolean;
  isVerified?: boolean;
  auth_token?: string;
  refresh_token?: string;
  access_token?: string;
  is_onboarding?: boolean;
}

export interface Tokens {
  access?: string;
  refresh?: string;
  auth?: string;
}

export interface UserProfile {
  user_id?: string;
  name?: string;
  photo_url?: string;
  username?: string;
}

export interface Profile extends Application {
  token?: string;
  userId?: string;
  deviceId?: string;
  fetchOptions?: Record<string, unknown>;
  verified?: boolean;
  user?: UserProfile;
}

export interface ApplicationConfig {
  lastVersion: Application;
}

export const application: ApplicationConfig = {
  lastVersion: {},
};
