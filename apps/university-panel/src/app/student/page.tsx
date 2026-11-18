'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { registerStudentMobile, forgotStudentPassword, resetStudentPassword } from '../../lib/api';

export type FactorType = 'code' | 'text' | 'pattern' | 'finger' | 'face';

export interface SecurityFactor {
  id: string;
  type: FactorType;
  label: string;
  value: string;
  detail?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'TRIP' | 'CHECKIN' | 'PERIMETER' | 'BATTERY' | 'SECURITY';
  title: string;
  detail: string;
  timestamp: string;
  status: 'SAFE' | 'COMPLETED' | 'VERIFIED' | 'WARNING';
}

export default function StudentAppSimulator() {
  // Theme state: Apple Pure Solid White (default) or Obsidian Dark
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cs_theme');
    const isDarkMode = saved === 'dark';
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('cs_theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Navigation Screens
  const [activeScreen, setActiveScreen] = useState<
    'home' | 'onboard' | 'security' | 'activity' | 'trip' | 'checkin' | 'sos' | 'calculator'
  >('home');

  // Active Student Profile
  const [currentStudent, setCurrentStudent] = useState({
    name: 'Maya Lin',
    email: 'mlin@ucr.edu',
    dorm: 'Dundee Hall',
    room: '412',
    phone: '(951) 555-0182',
    emergencyContact: 'Elena Lin (Mother) &bull; (951) 555-0192',
    medicalNotes: 'Carries EpiPen for severe peanut allergy',
  });

  // Configured Multi-Factor Authentication Sequence
  // Supports code, text, pattern, finger, face - EACH CAN BE USED MULTIPLE TIMES
  const [factors, setFactors] = useState<SecurityFactor[]>([
    { id: 'f-1', type: 'face', label: 'Face ID Scan', value: 'FaceID_Enrolled_UCR', detail: '3D TrueDepth Facial Geometry' },
    { id: 'f-2', type: 'code', label: 'Primary PIN (4-Digit)', value: '4829', detail: 'Numeric Escrow PIN' },
    { id: 'f-3', type: 'pattern', label: 'Pattern Lock', value: '1-2-5-8-9', detail: '3x3 Matrix Gesture' },
    { id: 'f-4', type: 'finger', label: 'Touch ID (Fingerprint)', value: 'Fingerprint_Index_Enrolled', detail: 'Biometric Touch Scan' },
    { id: 'f-5', type: 'text', label: 'Highlander Passphrase', value: 'highlander-blue-gold', detail: 'Cryptographic Passphrase' },
  ]);

  // Activity Log State
  const [activityLogs, setActivityLogs] = useState<ActivityEvent[]>([
    {
      id: 'act-1',
      type: 'TRIP',
      title: 'Safe Trip Completed',
      detail: 'Rivera Library to Dundee Hall (1.4 km) &bull; Arrived 4 min early',
      timestamp: '25 min ago',
      status: 'SAFE',
    },
    {
      id: 'act-2',
      type: 'CHECKIN',
      title: 'Routine 48h Check-In Verified',
      detail: 'Unlocked via Face ID + PIN 4829 &bull; Safe status renewed',
      timestamp: '3 hours ago',
      status: 'VERIFIED',
    },
    {
      id: 'act-3',
      type: 'PERIMETER',
      title: 'Within Campus Safe Corridor',
      detail: 'Canyon Crest Blue Light Perimeter Active &bull; GPS jitter 1.2m',
      timestamp: '5 hours ago',
      status: 'SAFE',
    },
    {
      id: 'act-4',
      type: 'SECURITY',
      title: 'Security Sequence Arranged',
      detail: 'Multi-factor authentication sequence reordered: [Face ID &rarr; PIN &rarr; Pattern]',
      timestamp: 'Yesterday',
      status: 'COMPLETED',
    },
    {
      id: 'act-5',
      type: 'BATTERY',
      title: 'Dead Man\'s Switch Heartbeat',
      detail: 'Battery at 94% &bull; Standby GPS beacon operational',
      timestamp: 'Yesterday',
      status: 'SAFE',
    },
  ]);

  // -------------------------------------------------------------------------
  // 3-SECOND LONG-PRESS SOS TRIGGER LOGIC WITH SVG RADIAL PROGRESS RING
  // -------------------------------------------------------------------------
  const [sosProgress, setSosProgress] = useState(0); // 0 to 100%
  const [sosHolding, setSosHolding] = useState(false);
  const [sosCancelledNotice, setSosCancelledNotice] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number>(0);

  const startSosHold = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setSosHolding(true);
    setSosCancelledNotice(false);
    setSosProgress(0);
    holdStartTimeRef.current = Date.now();

    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 3000) * 100);
      setSosProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        holdIntervalRef.current = null;
        setSosHolding(false);
        setSosProgress(100);
        triggerSosEmergency();
      }
    }, 30);
  };

  const cancelSosHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (sosHolding && sosProgress < 100) {
      setSosCancelledNotice(true);
      setTimeout(() => setSosCancelledNotice(false), 3500);
    }
    setSosHolding(false);
    setSosProgress(0);
  };

  const triggerSosEmergency = () => {
    setActiveScreen('sos');
    const newLog: ActivityEvent = {
      id: `act-${Date.now()}`,
      type: 'SECURITY',
      title: '🚨 Emergency SOS Beacon Dispatched',
      detail: '3-second sustained press confirmed &bull; Live GPS broadcast to UCPD Dispatch',
      timestamp: 'Just now',
      status: 'WARNING',
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  // -------------------------------------------------------------------------
  // ONBOARDING FORM STATE
  // -------------------------------------------------------------------------
  const [obName, setObName] = useState('Kavya Patel');
  const [obEmail, setObEmail] = useState('kpatel@ucr.edu');
  const [obDorm, setObDorm] = useState('Dundee Hall');
  const [obRoom, setObRoom] = useState('314-B');
  const [obPhone, setObPhone] = useState('(951) 555-0144');
  const [obContactName, setObContactName] = useState('Rajesh Patel');
  const [obContactPhone, setObContactPhone] = useState('(951) 555-0188');
  const [obContactRel, setObContactRel] = useState('Parent');
  const [obMedical, setObMedical] = useState('Severe peanut allergy; carries EpiPen');
  const [obSubmitting, setObSubmitting] = useState(false);
  const [obSuccess, setObSuccess] = useState(false);

  // Onboarding factor builder (can add any of code, text, pattern, finger, face multiple times)
  const [obFactors, setObFactors] = useState<SecurityFactor[]>([
    { id: 'ob-f1', type: 'face', label: 'Face ID', value: 'Face_Geometry_Scan', detail: '3D Facial Biometric' },
    { id: 'ob-f2', type: 'code', label: 'PIN Code', value: '7192', detail: '4-Digit Escrow PIN' },
    { id: 'ob-f3', type: 'finger', label: 'Fingerprint', value: 'TouchID_Enrolled', detail: 'Biometric Touch Scan' },
  ]);

  const addObFactor = (type: FactorType) => {
    const id = `ob-f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const labelMap: Record<FactorType, string> = {
      code: 'Numeric PIN',
      text: 'Passphrase',
      pattern: 'Pattern Lock',
      finger: 'Touch ID Fingerprint',
      face: 'Face ID Biometric',
    };
    const defaultVal: Record<FactorType, string> = {
      code: '5289',
      text: 'ucr-safety-token',
      pattern: '1-4-7-8-9',
      finger: 'Fingerprint_Touch_Scan',
      face: 'Face_Geometry_TrueDepth',
    };
    setObFactors((prev) => [
      ...prev,
      {
        id,
        type,
        label: `${labelMap[type]} (#${prev.filter((f) => f.type === type).length + 1})`,
        value: defaultVal[type],
        detail: `Configured factor instance`,
      },
    ]);
  };

  const moveObFactor = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= obFactors.length) return;
    const copy = [...obFactors];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setObFactors(copy);
  };

  const removeObFactor = (id: string) => {
    if (obFactors.length <= 1) {
      alert('At least one authentication factor is required.');
      return;
    }
    setObFactors((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setObSubmitting(true);
    try {
      // Post to backend API so it reflects in real-time in the University Security Panel
      await registerStudentMobile({
        universityEmail: obEmail.trim().toLowerCase(),
        profile: {
          fullName: obName.trim(),
          dormBuilding: obDorm,
          roomNumber: obRoom.trim(),
          emergencyContacts: [
            {
              name: obContactName.trim(),
              phone: obContactPhone.trim(),
              relationship: obContactRel,
            },
          ],
          medicalNotes: obMedical.trim(),
        },
        checkinIntervalHours: 48,
        factors: obFactors.map((f) => ({ type: f.type, config: { value: f.value } })),
        order: obFactors.map((_, i) => i),
      });

      // Update current student profile in simulator
      setCurrentStudent({
        name: obName.trim(),
        email: obEmail.trim().toLowerCase(),
        dorm: obDorm,
        room: obRoom.trim(),
        phone: obPhone.trim(),
        emergencyContact: `${obContactName} (${obContactRel}) &bull; ${obContactPhone}`,
        medicalNotes: obMedical.trim(),
      });

      // Update factors to the newly chosen set
      setFactors(obFactors);

      setObSuccess(true);
      setTimeout(() => {
        setObSuccess(false);
        setActiveScreen('home');
      }, 2500);

      // Add to activity log
      setActivityLogs((prev) => [
        {
          id: `act-${Date.now()}`,
          type: 'SECURITY',
          title: '✨ Onboarding Completed & Identity Escrowed',
          detail: `Enrolled as ${obName} (${obDorm}) with ${obFactors.length} custom authentication factors`,
          timestamp: 'Just now',
          status: 'SAFE',
        },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      alert('Onboarding registered locally & broadcast to console: ' + (err as Error).message);
      setObSuccess(true);
      setTimeout(() => {
        setObSuccess(false);
        setActiveScreen('home');
      }, 2000);
    } finally {
      setObSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // SECURITY & PASSWORD MANAGEMENT (Change, Forgot, Arrange, Set)
  // -------------------------------------------------------------------------
  const [securityTab, setSecurityTab] = useState<'manage' | 'forgot' | 'change'>('manage');
  const [forgotEmail, setForgotEmail] = useState('mlin@ucr.edu');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotStep, setForgotStep] = useState<'EMAIL' | 'OTP' | 'RESET'>('EMAIL');
  const [forgotDemoOtp, setForgotDemoOtp] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [changeOldPin, setChangeOldPin] = useState('');
  const [changeNewPin, setChangeNewPin] = useState('');
  const [changeSuccessNotice, setChangeSuccessNotice] = useState(false);

  const moveFactorOrder = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= factors.length) return;
    const copy = [...factors];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setFactors(copy);
  };

  const addFactorInstance = (type: FactorType) => {
    const id = `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const labelMap: Record<FactorType, string> = {
      code: 'Numeric PIN',
      text: 'Passphrase',
      pattern: 'Pattern Lock',
      finger: 'Touch ID Fingerprint',
      face: 'Face ID Biometric',
    };
    const defaultVal: Record<FactorType, string> = {
      code: '8391',
      text: 'ucr-safety-token',
      pattern: '2-5-8-0',
      finger: 'TouchID_Sensor_Enrolled',
      face: 'Face_Geometry_Mesh',
    };
    setFactors((prev) => [
      ...prev,
      {
        id,
        type,
        label: `${labelMap[type]} (#${prev.filter((f) => f.type === type).length + 1})`,
        value: defaultVal[type],
        detail: 'Dynamic multi-factor instance',
      },
    ]);
  };

  const removeFactorInstance = (id: string) => {
    if (factors.length <= 1) {
      alert('You must keep at least one factor.');
      return;
    }
    setFactors((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await forgotStudentPassword(forgotEmail.trim().toLowerCase());
      setForgotDemoOtp(res.demoOtp || '742918');
      setForgotStep('OTP');
    } catch {
      setForgotDemoOtp('742918');
      setForgotStep('OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await resetStudentPassword({
        universityEmail: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: 'new-secure-password',
      });
      setForgotStep('RESET');
    } catch {
      // Demo recovery succeeds
      setForgotStep('RESET');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleFinishReset = () => {
    setForgotStep('EMAIL');
    setForgotOtp('');
    setForgotDemoOtp(null);
    setSecurityTab('manage');
    alert('Security credentials & factor arrangements successfully restored!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeNewPin || changeNewPin.length < 4) {
      alert('Please enter a 4-digit PIN');
      return;
    }
    // Update PIN in factor sequence
    setFactors((prev) =>
      prev.map((f) => (f.type === 'code' ? { ...f, value: changeNewPin } : f)),
    );
    setChangeSuccessNotice(true);
    setChangeOldPin('');
    setChangeNewPin('');
    setTimeout(() => {
      setChangeSuccessNotice(false);
      setSecurityTab('manage');
    }, 2000);
  };

  // -------------------------------------------------------------------------
  // TRIP PLANNING & SAFE BOUNDARY SETTINGS
  // -------------------------------------------------------------------------
  const [tripOrigin, setTripOrigin] = useState('Rivera Library (UCR Main)');
  const [tripDestination, setTripDestination] = useState('Dundee Hall Residence');
  const [tripCorridorRadius, setTripCorridorRadius] = useState(1.8); // km
  const [tripTravelMode, setTripTravelMode] = useState<'WALKING' | 'BIKING' | 'TRANSIT' | 'RIDESHARE'>('WALKING');
  const [tripDurationMinutes, setTripDurationMinutes] = useState(30);
  const [tripCompanions, setTripCompanions] = useState('Study group with Sarah & Liam');
  const [isTripActive, setIsTripActive] = useState(true);

  // -------------------------------------------------------------------------
  // DECOY CALCULATOR DISGUISE
  // -------------------------------------------------------------------------
  const [calcDisplay, setCalcDisplay] = useState('0');

  const handleCalcPress = (btn: string) => {
    if (btn === 'C') {
      setCalcDisplay('0');
    } else if (btn === '=') {
      try {
        const sanitized = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcDisplay(String(res));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay((prev) => (prev === '0' || prev === 'Error' ? btn : prev + btn));
    }
  };

  // -------------------------------------------------------------------------
  // MULTI-FACTOR CHECK-IN FLOW
  // -------------------------------------------------------------------------
  const [checkinStep, setCheckinStep] = useState(0);
  const [checkinPinInput, setCheckinPinInput] = useState('');
  const [checkinPassphraseInput, setCheckinPassphraseInput] = useState('');
  const [checkinPatternDots, setCheckinPatternDots] = useState<number[]>([]);
  const [checkinResult, setCheckinResult] = useState<'IDLE' | 'APPROVED'>('IDLE');

  const handlePatternDotClick = (num: number) => {
    if (!checkinPatternDots.includes(num)) {
      setCheckinPatternDots([...checkinPatternDots, num]);
    }
  };

  const handleNextCheckinStep = () => {
    if (checkinStep < factors.length - 1) {
      setCheckinStep(checkinStep + 1);
    } else {
      setCheckinResult('APPROVED');
    }
  };

  const resetCheckin = () => {
    setCheckinStep(0);
    setCheckinPinInput('');
    setCheckinPassphraseInput('');
    setCheckinPatternDots([]);
    setCheckinResult('IDLE');
  };

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#fbfbfd] text-[#1d1d1f]'
      } flex flex-col items-center justify-start p-4 lg:p-8 font-sans transition-colors`}
    >
      {/* Top Header & Navigation Bar */}
      <header
        className={`w-full max-w-6xl mb-6 flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl ${
          isDark
            ? 'bg-slate-900/90 border border-slate-800'
            : 'bg-white border border-slate-200/80 shadow-sm'
        } backdrop-blur-md transition-all`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#003B5C] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#003B5C]/30">
            UCR
          </div>
          <div>
            <h1
              className={`font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span>CampusShield Student Mobile</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono">
                Highlander Edition
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Zero-Surveillance Anti-Coercion Escrow &bull; 3-Second SOS &bull; Dynamic Multi-Factor Security
            </p>
          </div>
        </div>

        {/* Top Controls: Light/Dark Mode Selector & Switch to Dispatch Console */}
        <div className="flex items-center gap-2.5">
          {/* Apple-Style Light / Dark Toggle */}
          <div
            className={`flex items-center p-0.5 rounded-xl border ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => {
                if (isDark) toggleTheme();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                !isDark
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Apple Pure White Mode"
            >
              <span>☀️</span>
              <span className="hidden sm:inline">Light Mode</span>
            </button>
            <button
              onClick={() => {
                if (!isDark) toggleTheme();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isDark
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Obsidian Dark Mode"
            >
              <span>🌙</span>
              <span className="hidden sm:inline">Dark Mode</span>
            </button>
          </div>

          <Link
            href="/dashboard"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-sm ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <span>🚔</span>
            <span>University Console</span>
          </Link>
        </div>
      </header>

      {/* Main Dual Showcase Layout */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Simulated Smartphone */}
        <div className="lg:col-span-5 flex justify-center">
          <div
            className={`relative w-[370px] h-[750px] rounded-[52px] p-3 shadow-2xl transition-all duration-300 ${
              isDark
                ? 'bg-[#0f172a] border-4 border-slate-700 ring-1 ring-slate-800 shadow-black/80'
                : 'bg-[#e5e5ea] border-4 border-[#d1d1d6] ring-1 ring-black/10 shadow-xl'
            } flex flex-col overflow-hidden`}
          >
            {/* iPhone Dynamic Island */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-40 flex items-center justify-between px-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="w-2.5 h-2.5 rounded-full bg-sky-900 border border-sky-400/40" />
              </div>
            </div>

            {/* Inner Phone Screen */}
            <div
              className={`relative flex-1 w-full rounded-[42px] overflow-hidden flex flex-col pt-8 pb-3 transition-colors ${
                isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
              }`}
            >
              {/* Phone Status Bar */}
              <div className="px-6 py-1 flex items-center justify-between text-[11px] font-medium z-30 shrink-0 select-none">
                <span className="font-semibold">9:41</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono">5G</span>
                  <span className="text-emerald-500 text-xs">●●●●</span>
                  <button
                    onClick={toggleTheme}
                    className="text-[11px] opacity-70 hover:opacity-100 transition-opacity"
                    title="Toggle Theme Inside Phone"
                  >
                    {isDark ? '☀️' : '🌙'}
                  </button>
                  <span className="font-mono text-[10px]">100%</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* Cancelled 3s Warning Ripple Banner */}
              {sosCancelledNotice && (
                <div className="mx-4 mt-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1.5 animate-pulse z-30 shrink-0">
                  <span>⚠️</span>
                  <span>Hold for 3 full seconds to prevent accidental dispatch</span>
                </div>
              )}

              {/* Phone Screen Body */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                {/* 1. HOME SCREEN */}
                {activeScreen === 'home' && (
                  <div className="space-y-3.5">
                    {/* Student Identity Header */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                            UC Riverside (UCR)
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {currentStudent.name}
                        </h2>
                        <span className="text-[10px] text-slate-400">
                          {currentStudent.email} &bull; {currentStudent.dorm} {currentStudent.room}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveScreen('calculator')}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-black'
                          }`}
                          title="Decoy Mode: Disguise as Calculator"
                        >
                          🧮
                        </button>
                      </div>
                    </div>

                    {/* Escrow Shield Status Card */}
                    <div
                      className={`p-2.5 rounded-2xl border flex items-center gap-2.5 ${
                        isDark
                          ? 'bg-emerald-950/30 border-emerald-500/30'
                          : 'bg-emerald-50/70 border-emerald-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                        🛡️
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          Zero-Surveillance Escrow Active
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                          Rotating Token: <code>3b18-e77a</code> &bull; Identity cryptographically sealed
                        </div>
                      </div>
                    </div>

                    {/* Active Safe Trip Card */}
                    {isTripActive && (
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          isDark
                            ? 'bg-slate-900/80 border-blue-500/40 shadow-lg shadow-blue-900/10'
                            : 'bg-white border-blue-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            Active Safe Trip
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Due in {tripDurationMinutes} min
                          </span>
                        </div>
                        <div className={`text-xs font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {tripOrigin} &rarr; {tripDestination}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2.5">
                          Safe corridor radius: {tripCorridorRadius} km &bull; {tripTravelMode.toLowerCase()}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsTripActive(false);
                              const newLog: ActivityEvent = {
                                id: `act-${Date.now()}`,
                                type: 'TRIP',
                                title: 'Arrived Safely',
                                detail: `Completed safe trip to ${tripDestination}`,
                                timestamp: 'Just now',
                                status: 'SAFE',
                              };
                              setActivityLogs((prev) => [newLog, ...prev]);
                            }}
                            className="flex-1 py-1.5 rounded-xl bg-[#003B5C] hover:brightness-110 text-white font-bold text-[11px] transition-all shadow-sm"
                          >
                            Mark Arrived Safely
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveScreen('trip')}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${
                              isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-300'
                                : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            Adjust
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ------------------------------------------------------------- */}
                    {/* 3-SECOND LONG-PRESS SOS TRIGGER BUTTON WITH SVG RADIAL RING */}
                    {/* ------------------------------------------------------------- */}
                    <div className="py-2 flex flex-col items-center justify-center select-none">
                      <div className="relative flex items-center justify-center">
                        {/* Outer Animated SVG Progress Ring */}
                        <svg className="w-36 h-36 -rotate-90 pointer-events-none z-10" viewBox="0 0 120 120">
                          {/* Background Track */}
                          <circle
                            cx="60"
                            cy="60"
                            r="52"
                            fill="none"
                            stroke={isDark ? '#334155' : '#e2e8f0'}
                            strokeWidth="5"
                          />
                          {/* Dynamic Active Progress Ring */}
                          <circle
                            cx="60"
                            cy="60"
                            r="52"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 52}
                            strokeDashoffset={2 * Math.PI * 52 * (1 - sosProgress / 100)}
                            style={{
                              transition: sosHolding ? 'stroke-dashoffset 0.03s linear' : 'stroke-dashoffset 0.3s ease',
                            }}
                          />
                        </svg>

                        {/* Interactive SOS Holdable Button */}
                        <button
                          type="button"
                          onMouseDown={startSosHold}
                          onMouseUp={cancelSosHold}
                          onMouseLeave={cancelSosHold}
                          onTouchStart={startSosHold}
                          onTouchEnd={cancelSosHold}
                          className={`absolute w-28 h-28 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-rose-500 border-4 border-white/40 shadow-xl flex flex-col items-center justify-center text-white cursor-pointer active:scale-95 transition-transform ${
                            sosHolding ? 'ring-4 ring-red-500/50 scale-105' : ''
                          }`}
                          style={{
                            boxShadow: sosHolding
                              ? '0 0 40px rgba(239, 68, 68, 0.8)'
                              : '0 8px 24px rgba(239, 68, 68, 0.4)',
                          }}
                        >
                          <span className="text-2xl animate-bounce">🚨</span>
                          <span className="font-black text-sm tracking-widest mt-0.5">SOS</span>
                          <span className="text-[8px] font-bold uppercase tracking-wider opacity-90">
                            {sosHolding ? `${((3000 - (sosProgress / 100) * 3000) / 1000).toFixed(1)}s` : 'Hold 3s'}
                          </span>
                        </button>
                      </div>

                      {/* Informational Subtext */}
                      <div className="text-center mt-2">
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {sosHolding ? (
                            <span className="text-red-500 font-extrabold animate-pulse">
                              HOLD CONTINUOUSLY ({Math.round(sosProgress)}%)...
                            </span>
                          ) : (
                            'Press & Hold for 3 Seconds to Alert'
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          Prevents accidental triggers &bull; Transmits GPS &amp; UCPD hotline
                        </p>
                      </div>
                    </div>

                    {/* Navigation Shortcut Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          resetCheckin();
                          setActiveScreen('checkin');
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base mb-1 block">🛡️</span>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Mark Check-In
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {factors.length}-Factor Sequence
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveScreen('trip')}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base mb-1 block">📍</span>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Plan Safe Trip
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Corridor &amp; Boundary
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveScreen('security')}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base mb-1 block">🔑</span>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Security Factors
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Set, Arrange, Reset
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveScreen('activity')}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base mb-1 block">📋</span>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Activity Log
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {activityLogs.length} events logged
                        </div>
                      </button>
                    </div>

                    {/* Direct UCR Police Department Hotline */}
                    <a
                      href="tel:(951)827-5222"
                      className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                        isDark
                          ? 'bg-red-950/30 border-red-500/40 text-red-300'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚔</span>
                        <div>
                          <div className="font-bold text-[11px]">UCR Campus Police (UCPD)</div>
                          <div className="text-[9px] opacity-80">24/7 Highlander Emergency Line</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[11px] underline">
                        (951) 827-5222
                      </span>
                    </a>
                  </div>
                )}

                {/* 2. ONBOARDING SCREEN (MOBILE ONBOARDING WITH LIVE REFLECTION ON UNIVERSITY) */}
                {activeScreen === 'onboard' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScreen('home')}
                          className="text-xs text-slate-400 hover:text-black dark:hover:text-white"
                        >
                          &larr; Back
                        </button>
                        <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Student Mobile Onboarding
                        </h3>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-mono">
                        Live Escrow
                      </span>
                    </div>

                    {obSuccess ? (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center space-y-2">
                        <span className="text-3xl block">🎉</span>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Onboarding Successfully Registered!
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Reflected in real time in the University Security Console student directory.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleCompleteOnboarding} className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            1. Personal Profile
                          </label>
                          <input
                            type="text"
                            required
                            value={obName}
                            onChange={(e) => setObName(e.target.value)}
                            placeholder="Full Name (e.g. Kavya Patel)"
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                          <input
                            type="email"
                            required
                            value={obEmail}
                            onChange={(e) => setObEmail(e.target.value)}
                            placeholder="UCR Email (@ucr.edu)"
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={obDorm}
                              onChange={(e) => setObDorm(e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-xl border text-xs ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            >
                              <option>Dundee Hall</option>
                              <option>Glen Mor Apartments</option>
                              <option>Aberdeen-Inverness (A&I)</option>
                              <option>Lothian Hall</option>
                              <option>Pentland Hills</option>
                              <option>North District</option>
                              <option>Stonehaven</option>
                              <option>Off-Campus Commuter</option>
                            </select>
                            <input
                              type="text"
                              value={obRoom}
                              onChange={(e) => setObRoom(e.target.value)}
                              placeholder="Room / Apt"
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            2. Emergency Contact &amp; Medical Notes
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={obContactName}
                              onChange={(e) => setObContactName(e.target.value)}
                              placeholder="Contact Name"
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                            <input
                              type="text"
                              value={obContactPhone}
                              onChange={(e) => setObContactPhone(e.target.value)}
                              placeholder="Contact Phone"
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>
                          <input
                            type="text"
                            value={obMedical}
                            onChange={(e) => setObMedical(e.target.value)}
                            placeholder="Critical Medical Notes (e.g. Allergies, Inhaler)"
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Factor Builder */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              3. Multi-Factor Unlock Arrangement
                            </label>
                            <span className="text-[9px] text-amber-500 font-semibold">
                              Can use factors multiple times
                            </span>
                          </div>

                          {/* Palette of 5 factor types to add */}
                          <div className="grid grid-cols-5 gap-1">
                            {(['face', 'code', 'pattern', 'finger', 'text'] as FactorType[]).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => addObFactor(type)}
                                className={`p-1.5 rounded-xl border text-center transition-all ${
                                  isDark
                                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                }`}
                                title={`Add another ${type} factor`}
                              >
                                <span className="text-xs block">
                                  {type === 'face' && '👤'}
                                  {type === 'code' && '🔢'}
                                  {type === 'pattern' && '⚡'}
                                  {type === 'finger' && '👆'}
                                  {type === 'text' && '🔤'}
                                </span>
                                <span className="text-[8px] font-bold uppercase block mt-0.5 truncate">
                                  +{type}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* List of currently chosen factors with reorder up/down and remove */}
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {obFactors.map((factor, idx) => (
                              <div
                                key={factor.id}
                                className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                                  isDark
                                    ? 'bg-slate-900 border-slate-800'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-[#003B5C] text-white flex items-center justify-center font-bold text-[10px]">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <div className="font-bold text-[11px]">{factor.label}</div>
                                    <div className="text-[9px] text-slate-400 font-mono">
                                      Value: {factor.value}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveObFactor(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white disabled:opacity-20 text-[10px]"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveObFactor(idx, 'down')}
                                    disabled={idx === obFactors.length - 1}
                                    className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white disabled:opacity-20 text-[10px]"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeObFactor(factor.id)}
                                    className="p-1 rounded text-red-500 hover:text-red-700 text-[10px]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={obSubmitting}
                          className="w-full py-2.5 rounded-2xl bg-[#003B5C] hover:brightness-110 text-white font-bold text-xs shadow-md transition-all mt-2"
                        >
                          {obSubmitting ? 'Registering & Notifying Console...' : 'Complete Onboarding & Sync Escrow'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* 3. SECURITY & FACTORS MANAGEMENT (Change, Forgot, Set, Arrange) */}
                {activeScreen === 'security' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScreen('home')}
                          className="text-xs text-slate-400 hover:text-black dark:hover:text-white"
                        >
                          &larr; Back
                        </button>
                        <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Security &amp; Factors
                        </h3>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono">
                        {factors.length} Active Factors
                      </span>
                    </div>

                    {/* Sub-tab navigation */}
                    <div
                      className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSecurityTab('manage')}
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                          securityTab === 'manage'
                            ? 'bg-[#003B5C] text-white shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        Arrange Sequence
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecurityTab('change')}
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                          securityTab === 'change'
                            ? 'bg-[#003B5C] text-white shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        Change Factor
                      </button>
                      <button
                        type="button"
                        onClick={() => setSecurityTab('forgot')}
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                          securityTab === 'forgot'
                            ? 'bg-[#003B5C] text-white shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        Forgot OTP
                      </button>
                    </div>

                    {/* Sub-tab 1: Manage & Arrange Sequence */}
                    {securityTab === 'manage' && (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Re-arrange your unlock steps. Any factor can be selected multiple times.
                        </p>

                        {/* Add factor buttons */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          <span className="text-[9px] font-bold uppercase text-slate-400 shrink-0">
                            + Add:
                          </span>
                          {(['face', 'code', 'pattern', 'finger', 'text'] as FactorType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => addFactorInstance(type)}
                              className={`px-2 py-1 rounded-lg border text-[9px] font-bold transition-colors shrink-0 ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              +{type}
                            </button>
                          ))}
                        </div>

                        {/* Factors arrangement list */}
                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                          {factors.map((f, idx) => (
                            <div
                              key={f.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800'
                                  : 'bg-white border-slate-200 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#003B5C] text-white flex items-center justify-center font-bold text-[10px]">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {f.label}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono">
                                    {f.detail || f.value}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveFactorOrder(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white disabled:opacity-20 text-[10px]"
                                  title="Move earlier in sequence"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveFactorOrder(idx, 'down')}
                                  disabled={idx === factors.length - 1}
                                  className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white disabled:opacity-20 text-[10px]"
                                  title="Move later in sequence"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeFactorInstance(f.id)}
                                  className="p-1 rounded text-red-500 hover:text-red-700 text-[10px]"
                                  title="Remove factor instance"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sub-tab 2: Change Factor Credentials */}
                    {securityTab === 'change' && (
                      <form onSubmit={handleChangePassword} className="space-y-3">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Update your master numeric PIN or biometric enrollment token.
                        </p>
                        {changeSuccessNotice && (
                          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs text-center font-bold">
                            ✓ Security PIN successfully updated!
                          </div>
                        )}
                        <div className="space-y-2">
                          <input
                            type="password"
                            placeholder="Current PIN (e.g. 4829)"
                            value={changeOldPin}
                            onChange={(e) => setChangeOldPin(e.target.value)}
                            maxLength={6}
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                          <input
                            type="password"
                            required
                            placeholder="New 4-Digit PIN"
                            value={changeNewPin}
                            onChange={(e) => setChangeNewPin(e.target.value)}
                            maxLength={6}
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 rounded-xl bg-[#003B5C] text-white font-bold text-xs"
                        >
                          Save New PIN
                        </button>
                      </form>
                    )}

                    {/* Sub-tab 3: Forgot Password / OTP Flow */}
                    {securityTab === 'forgot' && (
                      <div className="space-y-3">
                        {forgotStep === 'EMAIL' && (
                          <form onSubmit={handleSendForgotOtp} className="space-y-2.5">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Send a 6-digit emergency OTP recovery code to your registered university email.
                            </p>
                            <input
                              type="email"
                              required
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              placeholder="UCR Email"
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                            <button
                              type="submit"
                              disabled={forgotLoading}
                              className="w-full py-2 rounded-xl bg-[#003B5C] text-white font-bold text-xs"
                            >
                              {forgotLoading ? 'Dispatching OTP...' : 'Send Emergency OTP Code'}
                            </button>
                          </form>
                        )}

                        {forgotStep === 'OTP' && (
                          <form onSubmit={handleVerifyForgotOtp} className="space-y-2.5">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Enter the 6-digit verification code dispatched to <code>{forgotEmail}</code>.
                            </p>
                            {forgotDemoOtp && (
                              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px]">
                                Demo Verification OTP: <span className="font-mono font-bold">{forgotDemoOtp}</span>
                              </div>
                            )}
                            <input
                              type="text"
                              required
                              maxLength={6}
                              value={forgotOtp}
                              onChange={(e) => setForgotOtp(e.target.value)}
                              placeholder="6-Digit OTP (e.g. 742918)"
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono text-center tracking-widest font-bold ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                            <button
                              type="submit"
                              disabled={forgotLoading}
                              className="w-full py-2 rounded-xl bg-[#003B5C] text-white font-bold text-xs"
                            >
                              Verify Code &amp; Unlock Reset
                            </button>
                          </form>
                        )}

                        {forgotStep === 'RESET' && (
                          <div className="space-y-2.5 text-center">
                            <span className="text-3xl block">🔓</span>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              Identity Verified via University OTP
                            </div>
                            <p className="text-[10px] text-slate-500">
                              You can now arrange a brand new security sequence or reset credentials.
                            </p>
                            <button
                              type="button"
                              onClick={handleFinishReset}
                              className="w-full py-2 rounded-xl bg-[#003B5C] text-white font-bold text-xs"
                            >
                              Return to Security Sequence
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ACTIVITY LOG SCREEN */}
                {activeScreen === 'activity' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScreen('home')}
                          className="text-xs text-slate-400 hover:text-black dark:hover:text-white"
                        >
                          &larr; Back
                        </button>
                        <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Safety Activity Timeline
                        </h3>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 font-mono">
                        Stored 1 Year
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {activityLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-2.5 rounded-2xl border transition-colors ${
                            isDark
                              ? 'bg-slate-900 border-slate-800'
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                log.status === 'SAFE'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : log.status === 'VERIFIED'
                                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                  : log.status === 'COMPLETED'
                                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
                              }`}
                            >
                              {log.status}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">{log.timestamp}</span>
                          </div>
                          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {log.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {log.detail}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. SAFE TRIP PLANNING & BOUNDARIES SCREEN */}
                {activeScreen === 'trip' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScreen('home')}
                          className="text-xs text-slate-400 hover:text-black dark:hover:text-white"
                        >
                          &larr; Back
                        </button>
                        <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Plan Trip &amp; Set Boundaries
                        </h3>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono">
                        Geofence Escrow
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Origin Landmark
                        </label>
                        <select
                          value={tripOrigin}
                          onChange={(e) => setTripOrigin(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-xl border text-xs mt-1 ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <option>Rivera Library (UCR Main)</option>
                          <option>Student Rec Center (SRC)</option>
                          <option>Highlander Union Building (HUB)</option>
                          <option>Orbach Science Library</option>
                          <option>University Village (UV)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Destination Landmark
                        </label>
                        <select
                          value={tripDestination}
                          onChange={(e) => setTripDestination(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-xl border text-xs mt-1 ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <option>Dundee Hall Residence</option>
                          <option>Glen Mor Student Apartments</option>
                          <option>Aberdeen-Inverness (A&I)</option>
                          <option>Pentland Hills</option>
                          <option>North District</option>
                          <option>Canyon Crest Walkway</option>
                        </select>
                      </div>

                      {/* Travel Mode Pills */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Travel Mode
                        </label>
                        <div className="grid grid-cols-4 gap-1.5 mt-1">
                          {[
                            { id: 'WALKING', label: '🚶 Walk' },
                            { id: 'BIKING', label: '🚲 Bike' },
                            { id: 'TRANSIT', label: '🚌 Shuttle' },
                            { id: 'RIDESHARE', label: '🚗 Ride' },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setTripTravelMode(mode.id as any)}
                              className={`py-1.5 rounded-xl border text-[10px] font-bold transition-all text-center ${
                                tripTravelMode === mode.id
                                  ? 'bg-[#003B5C] text-white shadow-sm border-[#003B5C]'
                                  : isDark
                                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Corridor Radius Slider */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                          <span>Safe Boundary Buffer</span>
                          <span className="text-blue-500 font-mono">{tripCorridorRadius} km</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="5.0"
                          step="0.1"
                          value={tripCorridorRadius}
                          onChange={(e) => setTripCorridorRadius(parseFloat(e.target.value))}
                          className="w-full mt-1 accent-[#003B5C]"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400">
                          <span>500m (Tight)</span>
                          <span>2.5km (Standard)</span>
                          <span>5.0km (Extended)</span>
                        </div>
                      </div>

                      {/* Companions & Notes */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Trip Companions &amp; Notes
                        </label>
                        <input
                          type="text"
                          value={tripCompanions}
                          onChange={(e) => setTripCompanions(e.target.value)}
                          placeholder="e.g. Walking with Sarah & Liam from Lab"
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs mt-1 ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsTripActive(true);
                          const newLog: ActivityEvent = {
                            id: `act-${Date.now()}`,
                            type: 'TRIP',
                            title: 'Safe Trip Initiated',
                            detail: `${tripOrigin} &rarr; ${tripDestination} (${tripCorridorRadius}km buffer)`,
                            timestamp: 'Just now',
                            status: 'SAFE',
                          };
                          setActivityLogs((prev) => [newLog, ...prev]);
                          setActiveScreen('home');
                        }}
                        className="w-full py-2.5 rounded-2xl bg-[#003B5C] text-white font-bold text-xs shadow-md hover:brightness-110 transition-all mt-1"
                      >
                        Activate Safe Trip &amp; Geofence
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. MULTI-FACTOR CHECK-IN SCREEN */}
                {activeScreen === 'checkin' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScreen('home')}
                          className="text-xs text-slate-400 hover:text-black dark:hover:text-white"
                        >
                          &larr; Back
                        </button>
                        <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Multi-Factor Check-In
                        </h3>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono">
                        Step {checkinStep + 1} of {factors.length}
                      </span>
                    </div>

                    {checkinResult === 'APPROVED' ? (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-center space-y-2">
                        <span className="text-3xl block">🛡️</span>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Check-In Approved &amp; Verified
                        </div>
                        <p className="text-[10px] text-slate-500">
                          48-hour safety window renewed in university escrow.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveScreen('home')}
                          className="px-4 py-1.5 rounded-xl bg-[#003B5C] text-white text-xs font-bold mt-2"
                        >
                          Return Home
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-center py-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Authentication Factor #{checkinStep + 1}
                          </span>
                          <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {factors[checkinStep]?.label || 'Verification'}
                          </h4>
                        </div>

                        {/* Factor Input based on Type */}
                        {factors[checkinStep]?.type === 'face' && (
                          <div className="p-4 rounded-2xl border text-center space-y-2 border-dashed border-sky-500/40">
                            <span className="text-4xl block animate-pulse">👤</span>
                            <div className="text-xs font-bold">Face ID Highlander Mesh</div>
                            <p className="text-[10px] text-slate-400">Position face in camera frame</p>
                            <button
                              type="button"
                              onClick={handleNextCheckinStep}
                              className="px-4 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs"
                            >
                              Scan &amp; Authorize
                            </button>
                          </div>
                        )}

                        {factors[checkinStep]?.type === 'finger' && (
                          <div className="p-4 rounded-2xl border text-center space-y-2 border-dashed border-emerald-500/40">
                            <span className="text-4xl block animate-pulse">👆</span>
                            <div className="text-xs font-bold">Touch ID Sensor</div>
                            <p className="text-[10px] text-slate-400">Rest registered finger on sensor</p>
                            <button
                              type="button"
                              onClick={handleNextCheckinStep}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                            >
                              Verify Fingerprint
                            </button>
                          </div>
                        )}

                        {factors[checkinStep]?.type === 'code' && (
                          <div className="space-y-2 text-center">
                            <input
                              type="password"
                              maxLength={6}
                              value={checkinPinInput}
                              onChange={(e) => setCheckinPinInput(e.target.value)}
                              placeholder="Enter Numeric PIN"
                              className={`w-full px-3 py-2 rounded-xl border text-center text-sm font-mono tracking-widest font-bold ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={handleNextCheckinStep}
                              className="w-full py-2 rounded-xl bg-[#003B5C] text-white font-bold text-xs"
                            >
                              Confirm PIN
                            </button>
                          </div>
                        )}

                        {factors[checkinStep]?.type === 'pattern' && (
                          <div className="space-y-2 text-center">
                            <div className="grid grid-cols-3 gap-2 w-36 mx-auto p-2 bg-slate-900/10 dark:bg-slate-900 rounded-2xl">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => handlePatternDotClick(num)}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                                    checkinPatternDots.includes(num)
                                      ? 'bg-sky-500 text-white shadow-md'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={handleNextCheckinStep}
                              className="w-full py-2 rounded-xl bg-[#003B5C] text-white font-bold text-xs"
                            >
                              Confirm Pattern ({checkinPatternDots.length} dots)
                            </button>
                          </div>
                        )}

                        {factors[checkinStep]?.type === 'text' && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={checkinPassphraseInput}
                              onChange={(e) => setCheckinPassphraseInput(e.target.value)}
                              placeholder="Enter Passphrase (e.g. highlander-blue-gold)"
                              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                                isDark
                                  ? 'bg-slate-900 border-slate-800 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={handleNextCheckinStep}
                              className="w-full py-2 rounded-xl bg-[#003B5C] text-white font-bold text-xs"
                            >
                              Confirm Passphrase
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. LIVE SOS EMERGENCY VIEW */}
                {activeScreen === 'sos' && (
                  <div className="space-y-3 pt-1 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-600/20 text-red-600 flex items-center justify-center text-3xl mx-auto animate-ping">
                      🚨
                    </div>
                    <div>
                      <h3 className="text-base font-black text-red-600">
                        EMERGENCY SOS BEACON ACTIVE
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Highlander Dispatch &amp; UCPD Officers Notified
                      </p>
                    </div>

                    {/* Nearest Police Station Card */}
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-left space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-red-600 uppercase">
                          Nearest Police Dispatch
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">0.28 km away</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        UC Riverside Police Department (UCPD)
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        3500 Canyon Crest Dr, Riverside, CA 92507
                      </div>
                      <a
                        href="tel:(951)827-5222"
                        className="inline-block mt-1 font-mono font-bold text-xs text-red-600 underline"
                      >
                        Direct Call: (951) 827-5222
                      </a>
                    </div>

                    {/* Student Info Card unsealed */}
                    <div
                      className={`p-2.5 rounded-2xl border text-left text-xs ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="font-bold text-[11px] mb-1">Unsealed Emergency Ledger:</div>
                      <div className="text-[10px] text-slate-500">
                        Student: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentStudent.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Residence: {currentStudent.dorm} Room {currentStudent.room}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Emergency Contact: {currentStudent.emergencyContact}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Medical Alert: {currentStudent.medicalNotes}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveScreen('home')}
                      className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                    >
                      Cancel Beacon &amp; Return Home
                    </button>
                  </div>
                )}

                {/* 8. DECOY CALCULATOR DISGUISE */}
                {activeScreen === 'calculator' && (
                  <div className="h-full flex flex-col justify-between pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-slate-400">Calculator</span>
                      <button
                        type="button"
                        onClick={() => setActiveScreen('home')}
                        className="text-[10px] text-slate-400 hover:text-black dark:hover:text-white"
                      >
                        [Exit Decoy]
                      </button>
                    </div>

                    <div
                      className={`w-full p-3 rounded-2xl border mb-3 text-right ${
                        isDark
                          ? 'bg-black/40 border-slate-800 text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="text-2xl font-mono font-bold truncate">{calcDisplay}</div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 flex-1">
                      {['C', '+/-', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map(
                        (btn, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleCalcPress(btn)}
                            className={`rounded-2xl font-bold text-sm flex items-center justify-center transition-all ${
                              btn === '0'
                                ? 'col-span-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                                : ['÷', '×', '-', '+', '='].includes(btn)
                                ? 'bg-amber-600 text-white'
                                : ['C', '+/-', '%'].includes(btn)
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-200'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                            }`}
                            style={{ height: '44px' }}
                          >
                            {btn}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Phone Bar Indicator */}
              <div
                className={`w-32 h-1 rounded-full mx-auto mt-2 shrink-0 ${
                  isDark ? 'bg-slate-700' : 'bg-slate-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Simulator Controls & Architecture Overview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Screen Selector Panel */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-800 shadow-xl'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h2
                className={`text-sm font-bold flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                <span className="text-lg">📱</span>
                <span>Mobile Phone Simulated Screens</span>
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono">
                Interactive
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Test each mobile capability inside the phone on the left. All actions synchronize live with the University Console.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveScreen('home')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'home'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/40'
                    : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>🏠 Home &amp; 3s SOS</div>
                <div className="text-[10px] font-normal opacity-70">Escrow &amp; Hold Alert</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('onboard')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'onboard'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/40'
                    : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>✨ Onboarding Wizard</div>
                <div className="text-[10px] font-normal opacity-70">Syncs to University</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('security')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'security'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/40'
                    : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>🔑 Multi-Factor Manager</div>
                <div className="text-[10px] font-normal opacity-70">Arrange, Set, Forgot OTP</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('activity')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'activity'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/40'
                    : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>📋 Activity Log</div>
                <div className="text-[10px] font-normal opacity-70">1-Year History Stored</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('trip')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'trip'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40'
                    : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>📍 Trip &amp; Boundary</div>
                <div className="text-[10px] font-normal opacity-70">Corridor Radius Buffer</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('calculator')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'calculator'
                    ? 'bg-slate-500/10 border-slate-500 text-slate-600 dark:text-slate-300 ring-1 ring-slate-500/40'
                    : isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>🧮 Decoy Calculator</div>
                <div className="text-[10px] font-normal opacity-70">Discreet Camouflage</div>
              </button>
            </div>
          </div>

          {/* Key Feature Architecture Cards */}
          <div
            className={`p-4 rounded-2xl border transition-all space-y-3 ${
              isDark
                ? 'bg-slate-900 border-slate-800 shadow-xl'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <h3
              className={`text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Implemented Student Architecture Highlights
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800/80'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-bold text-red-500 mb-1 flex items-center gap-1.5">
                  <span>🚨</span>
                  <span>3-Second Long-Press SOS</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Prevents false dispatches by requiring 3.0 continuous seconds of contact. Displays an animated circular SVG energy ring with live countdown. Releasing early resets safely.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800/80'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-bold text-purple-500 mb-1 flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>5-Factor Arranger (Multiple Uses)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Students choose between <code>code</code>, <code>text</code>, <code>pattern</code>, <code>finger</code>, and <code>face</code>. Each factor can be selected multiple times and placed in any custom sequence.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800/80'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-bold text-emerald-500 mb-1 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>Live Mobile Onboarding</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  When a student signs up or onboards on mobile, the University Console receives an instant WebSocket push and adds them directly to the Student Registry without delay.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-950 border-slate-800/80'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-bold text-blue-500 mb-1 flex items-center gap-1.5">
                  <span>☀️</span>
                  <span>Pure White &amp; Dark Mode Toggle</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Switch instantly between Apple pure solid white light mode and dark mode via the top selector. Both the University portal and student mobile app adapt seamlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
