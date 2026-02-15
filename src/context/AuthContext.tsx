import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Role = Profile['role'];

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: Role | null;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      console.log(`[Auth] Fetching role for ${userId}...`);
      
      const fetchPromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Role fetch timed out')), 5000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Error fetching role:', error);
        return 'patient'; // Fallback to patient role on error/timeout
      }
      return (data?.role as Role) || 'patient';
    } catch (error) {
      console.error('Unexpected error fetching role:', error);
      return 'patient';
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        console.time('[Auth] getSession');
        const { data: { session } } = await supabase.auth.getSession();
        console.timeEnd('[Auth] getSession');
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fast-path: Check metadata first
          const metaRole = session.user.user_metadata?.role as Role;
          if (metaRole && mounted) {
            console.log(`[Auth] Fast-path role from metadata: ${metaRole}`);
            setRole(metaRole);
            setLoading(false);
          }

          // Background sync with database
          const dbRole = await fetchRole(session.user.id);
          if (mounted) {
            if (dbRole) setRole(dbRole);
            setLoading(false); // Ensure loading is false even if metadata was missing
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] initialization error:", err);
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log(`[Auth] State changed: ${event}`);
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN') {
        console.time('[Auth] login-to-redirect');
        
        // Fast-path: Check metadata first
        const metaRole = session?.user?.user_metadata?.role as Role;
        if (metaRole) {
          console.log(`[Auth] Fast-path role found: ${metaRole}. Bypassing loading state.`);
          setRole(metaRole);
          setLoading(false); // Clear any existing loading state
          console.timeEnd('[Auth] login-to-redirect');
        } else {
          console.log('[Auth] No metadata role, showing loading spinner.');
          setLoading(true);
        }

        // Always sync with DB in background
        console.time('[Auth] db-role-sync');
        const dbRole = await fetchRole(session?.user?.id || '');
        console.timeEnd('[Auth] db-role-sync');
        
        if (mounted) {
          if (dbRole) setRole(dbRole);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setLoading(false);
      } else {
        // For other events like TOKEN_REFRESHED, ensure we have a role
        if (session?.user && !role) {
          const dbRole = await fetchRole(session.user.id);
          if (mounted) setRole(dbRole);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('[Auth] Signing out...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Supabase signOut error:', error);
      }

      setSession(null);
      setUser(null);
      setRole(null);
      
      // Redirect to portal selection page
      window.location.href = '/';
    } catch (err) {
      console.error('[Auth] Unexpected error during signOut:', err);
      setLoading(false);
    }
  };

  const value = useMemo(() => ({
    session,
    user,
    role,
    signOut,
    loading
  }), [session, user, role, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
