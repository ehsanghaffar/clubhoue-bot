import fs from 'fs';
import path from 'path';
import { clubService } from './club-api.service';
import type { AgentFunction } from '../types/services';
import type { Profile } from '../types/config';
import agent from '../helper/agent';

export function initializeService(): void {
  try {
    const profilePath = path.join(process.cwd(), 'profile.json');

    if (!fs.existsSync(profilePath)) {
      console.warn('⚠️  profile.json not found at', profilePath);
      console.warn('Service will operate without credentials. Login first.');
      return;
    }

    const profile: Profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

    const agentFunction: AgentFunction = (url, options, customs) => {
      const mergedCustoms = {
        ...profile,
        ...customs,
        token: profile.token ?? (profile as unknown as { tokens?: { auth?: string } }).tokens?.auth,
      };
      
      return agent(url, options, mergedCustoms);
    };

    clubService.setProfile(profile);
    clubService.setAgent(agentFunction);

    console.log('✓ ClubApiService initialized with profile:', {
      user: profile.user?.username ?? 'unknown',
      userId: profile.user?.user_id ?? 'unknown',
      verified: profile.verified ?? false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize ClubApiService:', message);
    throw error;
  }
}
