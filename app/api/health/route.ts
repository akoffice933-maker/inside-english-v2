import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

/**
 * GET /api/health
 * 
 * Production-grade Database-Aware Health Check Endpoint (Resolves Yellow Flag #3).
 * Verifies Next.js server connectivity and performs a quick, low-cost query 
 * to ensure PostgreSQL/Supabase database connections are active and non-degraded.
 */
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();

    // Query 1 track row with a strict limit to minimize database load
    const { error } = await supabase
      .from('tracks')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    }, { status: 200 });

  } catch (err: any) {
    console.error('[Health Check Alert] Database connectivity degraded:', err.message || err);
    
    return NextResponse.json({ 
      status: 'degraded', 
      error: err.message || 'Database connection offline',
      timestamp: new Date().toISOString() 
    }, { status: 503 });
  }
}
