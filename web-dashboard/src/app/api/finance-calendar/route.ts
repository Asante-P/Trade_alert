import { NextRequest, NextResponse } from 'next/server';
import { realEconomicDataService } from '@/lib/real-economic-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'today';
    const series = searchParams.get('series');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    if (action === 'today') {
      const todayData = await realEconomicDataService.fetchTodayFinanceCalendar();
      return NextResponse.json({
        success: true,
        data: todayData,
        source: 'Finance Calendar API'
      });
    }

    if (action === 'next' && series) {
      const nextOccurrence = await realEconomicDataService.fetchNextOccurrence(series);
      return NextResponse.json({
        success: true,
        data: nextOccurrence,
        source: 'Finance Calendar API'
      });
    }

    if (action === 'calendar') {
      const calendarData = await realEconomicDataService.fetchEconomicCalendar();
      return NextResponse.json({
        success: true,
        data: calendarData,
        source: 'Finance Calendar API'
      });
    }

    if (action === 'range' && fromDate && toDate) {
      const rangeData = await realEconomicDataService.fetchFinanceCalendarData(fromDate, toDate);
      return NextResponse.json({
        success: true,
        data: rangeData,
        source: 'Finance Calendar API'
      });
    }

    // Default: get today's data
    const todayData = await realEconomicDataService.fetchTodayFinanceCalendar();
    return NextResponse.json({
      success: true,
      data: todayData,
      source: 'Finance Calendar API'
    });

  } catch (error) {
    console.error('Error in Finance Calendar API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}