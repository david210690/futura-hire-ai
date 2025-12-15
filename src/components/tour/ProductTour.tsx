import { useEffect, useCallback } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useProductTour } from '@/hooks/useProductTour';

interface ProductTourProps {
  role: 'recruiter' | 'candidate';
  autoStart?: boolean;
  onComplete?: () => void;
}

const recruiterSteps = [
  {
    element: '[data-tour="dashboard-stats"]',
    popover: {
      title: 'Your Hiring Overview',
      description: 'See key metrics at a glance: open jobs, candidates in review, and hiring performance.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="hiring-metrics"]',
    popover: {
      title: 'Hiring Performance',
      description: 'Track time-to-hire, hiring velocity, and conversion rates to optimize your process.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="quick-actions"]',
    popover: {
      title: 'Quick Actions',
      description: 'Access Role Designer for AI-powered job creation, manage assessments, and view analytics.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="sidebar-hiring"]',
    popover: {
      title: 'Hiring Tools',
      description: 'Create jobs, design roles with AI, and build assessments from the sidebar.',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="sidebar-ai-tools"]',
    popover: {
      title: 'AI-Powered Features',
      description: 'Access the Question Bank, Decision Room, and Pipeline Health analytics.',
      side: 'right' as const,
    },
  },
];

const candidateSteps = [
  {
    element: '[data-tour="profile-card"]',
    popover: {
      title: 'Complete Your Profile',
      description: 'Keep your profile up-to-date to get better job matches and AI recommendations.',
      side: 'bottom' as const,
    },
  },
  {
    element: '[data-tour="opportunity-radar"]',
    popover: {
      title: 'Opportunity Radar',
      description: 'Discover role families that match your skills and find high-impact areas to focus on.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="career-trajectory"]',
    popover: {
      title: 'Career Trajectory',
      description: 'Map your career path with AI-powered planning, salary projections, and action plans.',
      side: 'top' as const,
    },
  },
  {
    element: '[data-tour="sidebar-job-search"]',
    popover: {
      title: 'Smart Job Search',
      description: 'Use AI Job Twin for personalized job matching and the Opportunity Radar for career insights.',
      side: 'right' as const,
    },
  },
  {
    element: '[data-tour="sidebar-interview-prep"]',
    popover: {
      title: 'Interview Practice',
      description: 'Prepare with text-based practice and AI voice interviews to boost your confidence.',
      side: 'right' as const,
    },
  },
];

export function ProductTour({ role, autoStart = false, onComplete }: ProductTourProps) {
  const { completeTour, shouldShowTour } = useProductTour(role);

  const startTour = useCallback(() => {
    const steps = role === 'recruiter' ? recruiterSteps : candidateSteps;
    
    // Filter steps to only include elements that exist
    const availableSteps = steps.filter(step => {
      if (!step.element) return true;
      return document.querySelector(step.element);
    });

    if (availableSteps.length === 0) return;

    const driverObj: Driver = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done!',
      popoverClass: 'futurhire-tour-popover',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      stagePadding: 8,
      stageRadius: 8,
      animate: true,
      allowClose: true,
      steps: availableSteps,
      onDestroyed: () => {
        completeTour();
        onComplete?.();
      },
    });

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      driverObj.drive();
    }, 500);
  }, [role, completeTour, onComplete]);

  useEffect(() => {
    if (autoStart && shouldShowTour) {
      // Wait for page to fully load
      const timer = setTimeout(startTour, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, shouldShowTour, startTour]);

  return null;
}

export { useProductTour };
