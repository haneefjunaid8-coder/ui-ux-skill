import type { LucideIcon } from 'lucide-react';
import { Building2, MapPin, ShieldCheck, Smartphone } from 'lucide-react';

/*
 * Site copy and structured content. Keeping copy here (not in components)
 * makes it easy to review, translate, or replace once the brief is approved.
 */

export interface NavItem {
  label: string;
  to: string;
}

/** Primary navigation. Hash links point to sections on the landing page. */
export const primaryNav: NavItem[] = [
  { label: 'Services', to: '/#services' },
  { label: 'How it works', to: '/#how-it-works' },
  { label: 'Design system', to: '/design-system' },
];

export interface Highlight {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
}

export const serviceHighlights: Highlight[] = [
  {
    id: 'campus',
    title: 'Built for campus life',
    body: 'Deliveries designed around UNIOSUN hostels, offices and everyday student routines.',
    icon: Building2,
  },
  {
    id: 'areas',
    title: 'Approved areas only',
    body: 'Service is limited to UNIOSUN and approved surrounding student-township areas, so coverage stays clear.',
    icon: MapPin,
  },
  {
    id: 'trust',
    title: 'Accountable by design',
    body: 'Each stage of a delivery is meant to be visible to the people involved, from request to handover.',
    icon: ShieldCheck,
  },
  {
    id: 'mobile',
    title: 'Works like an app',
    body: 'ROOT-X runs in the browser on any phone, tablet or laptop, and can be installed to your home screen.',
    icon: Smartphone,
  },
];

export interface Step {
  id: string;
  title: string;
  body: string;
}

export const howItWorksSteps: Step[] = [
  {
    id: 'request',
    title: 'Tell us what you need',
    body: 'Describe what should be delivered and where it should go within the approved areas.',
  },
  {
    id: 'confirm',
    title: 'Confirm the details',
    body: 'Check the pickup and drop-off points before anything is sent out.',
  },
  {
    id: 'deliver',
    title: 'Receive it safely',
    body: 'Get it delivered to your door, hostel or office within the agreed window.',
  },
];

export const siteName = 'ROOT-X';
export const siteTagline = 'Campus deliveries';
export const serviceArea = 'UNIOSUN and approved student-township areas, Osun State';
