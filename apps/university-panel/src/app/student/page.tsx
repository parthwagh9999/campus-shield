'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StudentAppSimulator() {
  const [activeScreen, setActiveScreen] = useState<'home' | 'trip' | 'checkin' | 'sos' | 'calculator'>('home');
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [checkinStep, setCheckinStep] = useState(1);
  const [pinInput, setPinInput] = useState('');
  const [patternDots, setPatternDots] = useState<number[]>([]);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [checkinResult, setCheckinResult] = useState<'IDLE' | 'APPROVED'>('IDLE');
  const [isCoercedAttempt, setIsCoercedAttempt] = useState(false);
  const [tripRadius, setTripRadius] = useState(2);
  const [tripDuration, setTripDuration] = useState(2);
  const [isTripActive, setIsTripActive] = useState(true);

  // Calculator logic for Decoy Mode
  const handleCalcPress = (btn: string) => {
    if (btn === 'C') {
      setCalcDisplay('0');
    } else if (btn === '=') {
      try {
        // Safe evaluation of basic math
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

  const handlePatternDotClick = (num: number) => {
    if (!patternDots.includes(num)) {
      setPatternDots([...patternDots, num]);
    }
  };

  const handleFinishCheckin = (coerced: boolean) => {
    setIsCoercedAttempt(coerced);
    setCheckinResult('APPROVED');
  };

  const resetCheckin = () => {
    setCheckinStep(1);
    setPinInput('');
    setPatternDots([]);
    setPassphraseInput('');
    setCheckinResult('IDLE');
    setIsCoercedAttempt(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 lg:p-8 font-sans">
      {/* Top Header & Navigation */}
      <header className="w-full max-w-5xl mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/30">
            CS
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wide text-white flex items-center gap-2">
              <span>CampusShield Student Mobile</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono">
                Simulated Client
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Student-Side Application &bull; Dual-Mode Anti-Coercion Identity Escrow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <span>🚔</span>
            <span>Switch to University Dispatch Console</span>
          </Link>
        </div>
      </header>

      {/* Main Dual Showcase View */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Phone Mockup */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-[360px] h-[720px] bg-black rounded-[48px] p-3 shadow-2xl border-4 border-slate-700 ring-1 ring-slate-800 flex flex-col overflow-hidden">
            {/* Phone Speaker & Dynamic Island */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-full z-30 flex items-center justify-between px-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-blue-900 border border-blue-500/40 animate-pulse" />
            </div>

            {/* Phone Screen Container */}
            <div className="relative flex-1 w-full bg-slate-950 rounded-[38px] overflow-hidden flex flex-col pt-7 pb-4">
              {/* iOS Status Bar */}
              <div className="px-5 py-1.5 flex items-center justify-between text-[11px] text-slate-300 font-medium z-20 shrink-0">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono">5G</span>
                  <span className="text-emerald-400 text-xs">●●●●</span>
                  <span className="font-mono text-[10px]">100%</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* Screen Body */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {/* 1. HOME SCREEN */}
                {activeScreen === 'home' && (
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          UC Riverside (UCR)
                        </span>
                        <h2 className="text-base font-extrabold text-white">Maya Lin</h2>
                        <span className="text-[10px] text-slate-400">mlin@ucr.edu &bull; Dundee 412</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveScreen('calculator')}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white"
                        title="Discreet Decoy Mode (Disguise as Calculator)"
                      >
                        🧮
                      </button>
                    </div>

                    {/* Identity Escrow Active Banner */}
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-emerald-300">
                          Zero-Surveillance Mode Active
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">
                          AES-256 Vault Locked &bull; Anonymous session token
                        </div>
                      </div>
                    </div>

                    {/* Active Trip Banner */}
                    {isTripActive && (
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/50 shadow-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40">
                            Active Safe Trip
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Due: 09:45 PM</span>
                        </div>
                        <div className="text-xs font-bold text-white mb-0.5">
                          Dundee Hall &rarr; Canyon Crest Walkway
                        </div>
                        <div className="text-[10px] text-slate-400 mb-2">
                          Safe radius: 1.85 km &bull; Background geofencing active
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsTripActive(false)}
                            className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors"
                          >
                            Mark Arrived Safely
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveScreen('trip')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Big Emergency SOS Button */}
                    <div className="py-2 flex flex-col items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setActiveScreen('sos')}
                        className="w-32 h-32 rounded-full bg-gradient-to-tr from-red-700 to-red-500 border-4 border-red-400/80 shadow-[0_0_35px_rgba(239,68,68,0.6)] flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
                      >
                        <span className="text-3xl">🚨</span>
                        <span className="font-black text-sm tracking-widest mt-1">SOS</span>
                        <span className="text-[9px] opacity-80 uppercase tracking-wider">Tap to Alert</span>
                      </button>
                      <span className="text-[10px] text-slate-500 mt-2">
                        Instantly dispatches GPS, medical notes &amp; UCPD hotline
                      </span>
                    </div>

                    {/* Quick Action Tiles */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          resetCheckin();
                          setActiveScreen('checkin');
                        }}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-colors"
                      >
                        <span className="text-base mb-1 block">🛡️</span>
                        <div className="text-xs font-bold text-white">Mark Present</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Due in 38 hours</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveScreen('trip')}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-colors"
                      >
                        <span className="text-base mb-1 block">📍</span>
                        <div className="text-xs font-bold text-white">Safe Trip</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Perimeter &amp; timer</div>
                      </button>
                    </div>

                    {/* Campus Police Hotline Tile */}
                    <a
                      href="tel:(951)827-5222"
                      className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between text-xs text-red-200"
                    >
                      <div className="flex items-center gap-2">
                        <span>🚔</span>
                        <div>
                          <div className="font-bold text-[11px]">UCR Campus Police (UCPD)</div>
                          <div className="text-[9px] text-slate-400">24/7 Highlander Dispatch</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[11px] text-red-400">
                        (951) 827-5222
                      </span>
                    </a>
                  </div>
                )}

                {/* 2. SAFE TRIP CONFIGURATION */}
                {activeScreen === 'trip' && (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="font-bold text-white text-sm">Configure Safe Trip</h3>
                      <button
                        type="button"
                        onClick={() => setActiveScreen('home')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Trip Duration (Hours)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 4, 8].map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setTripDuration(h)}
                            className={`py-2 rounded-lg font-bold text-xs ${
                              tripDuration === h
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {h}h
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Safe Perimeter Radius (km)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 5].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setTripRadius(r)}
                            className={`py-2 rounded-lg font-bold text-xs ${
                              tripRadius === r
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {r} km
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="font-bold text-white mb-0.5">🛡️ Zero-Surveillance Geofencing:</div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        If you exit your {tripRadius} km boundary or fail to check in before {tripDuration} hours, you receive a 60-second grace countdown on your phone before university dispatch is alerted.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTripActive(true);
                        setActiveScreen('home');
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
                    >
                      Activate Safe Trip &bull; {tripRadius}km / {tripDuration}h
                    </button>
                  </div>
                )}

                {/* 3. CHECK-IN SCREEN (ANTI-COERCION 3-FACTOR) */}
                {activeScreen === 'checkin' && (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <h3 className="font-bold text-white text-sm">Periodic Check-In</h3>
                        <span className="text-[9px] text-amber-400">3-Password Ordered Authentication</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveScreen('home')}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    {checkinResult === 'APPROVED' ? (
                      <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-3xl font-bold">
                          ✓
                        </div>
                        <h4 className="text-base font-extrabold text-white">
                          Approved &bull; Checked In
                        </h4>
                        <p className="text-xs text-slate-300 px-4">
                          Your periodic safety check-in has been validated. Timer reset for 48 hours.
                        </p>

                        {/* Coercion disclosure for demonstrator */}
                        {isCoercedAttempt && (
                          <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-left text-[11px] text-red-200 space-y-1 mt-4">
                            <div className="font-bold text-red-400 flex items-center gap-1">
                              <span>🚨</span> Anti-Coercion Triggered!
                            </div>
                            <p className="text-[10px] text-slate-300">
                              You entered the factors in duress order. To anyone looking at your phone, it displays <strong>"Approved"</strong>, but a Silent Coercion Alert with live coordinates was sent to UCPD Dispatch.
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveScreen('home')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold mt-4"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Step progress pills */}
                        <div className="flex items-center gap-1 justify-center">
                          {[1, 2, 3].map((s) => (
                            <span
                              key={s}
                              className={`h-1.5 flex-1 rounded-full ${
                                checkinStep >= s ? 'bg-amber-400' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Step 1: PIN */}
                        {checkinStep === 1 && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-300">
                              Step 1: Enter 4-Digit Security PIN
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              value={pinInput}
                              onChange={(e) => setPinInput(e.target.value)}
                              placeholder="••••"
                              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-center text-lg font-mono tracking-widest text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setCheckinStep(2)}
                              disabled={pinInput.length < 4}
                              className="w-full py-2 bg-blue-600 disabled:opacity-40 text-white font-bold text-xs rounded-lg"
                            >
                              Next: Pattern Lock &rarr;
                            </button>
                          </div>
                        )}

                        {/* Step 2: Pattern Lock Grid */}
                        {checkinStep === 2 && (
                          <div className="space-y-2 text-center">
                            <label className="block text-xs font-bold text-slate-300">
                              Step 2: Connect 3x3 Security Pattern
                            </label>
                            <div className="w-48 h-48 mx-auto grid grid-cols-3 gap-3 p-3 bg-slate-900 rounded-2xl border border-slate-800">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
                                const isPicked = patternDots.includes(dot);
                                return (
                                  <button
                                    key={dot}
                                    type="button"
                                    onClick={() => handlePatternDotClick(dot)}
                                    className={`rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                                      isPicked
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                  >
                                    {dot}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Connected: {patternDots.length > 0 ? patternDots.join(' &rarr; ') : 'Tap dots'}
                            </div>
                            <button
                              type="button"
                              onClick={() => setCheckinStep(3)}
                              disabled={patternDots.length < 3}
                              className="w-full py-2 bg-blue-600 disabled:opacity-40 text-white font-bold text-xs rounded-lg mt-2"
                            >
                              Next: Passphrase &rarr;
                            </button>
                          </div>
                        )}

                        {/* Step 3: Passphrase & Demonstration Branches */}
                        {checkinStep === 3 && (
                          <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-300">
                              Step 3: Enter Passphrase
                            </label>
                            <input
                              type="text"
                              value={passphraseInput}
                              onChange={(e) => setPassphraseInput(e.target.value)}
                              placeholder="e.g. golden-bear-blue"
                              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                            />

                            <div className="pt-2 space-y-2">
                              <button
                                type="button"
                                onClick={() => handleFinishCheckin(false)}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                              >
                                <span>✓</span>
                                <span>Submit Correct Order (Normal Safe)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleFinishCheckin(true)}
                                className="w-full py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                              >
                                <span>🚨</span>
                                <span>Submit Duress Order (Silent Coercion SOS)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. EMERGENCY SOS ACTIVE */}
                {activeScreen === 'sos' && (
                  <div
                    className={`space-y-4 pt-2 h-full flex flex-col justify-between ${
                      isSilentMode ? 'opacity-30' : ''
                    }`}
                  >
                    <div>
                      <div className="p-3 bg-red-950/80 border border-red-500 rounded-2xl text-center space-y-1 mb-4">
                        <span className="text-3xl animate-pulse inline-block">🚨</span>
                        <h3 className="font-extrabold text-white text-sm">
                          {isSilentMode ? 'Silent Emergency Active' : 'Emergency Dispatch Active'}
                        </h3>
                        <p className="text-[10px] text-red-200">
                          Live coordinates dispatched to UC Riverside Police (UCPD).
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>Status:</span>
                          <span className="text-red-400 animate-pulse">● Live GPS Streaming</span>
                        </div>
                        <div>Nearest Police: UCPD Canyon Crest (0.28 km)</div>
                        <div>Battery: 42% &bull; Speed: 2.1 m/s &bull; Heading: SE</div>
                        <div className="text-[10px] text-amber-300 pt-1 border-t border-slate-800">
                          Identity Unsealed: Maya Lin (Dundee 412)
                        </div>
                      </div>

                      {/* Silent Stealth Mode Toggle */}
                      <div className="mt-4 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">Stealth Screen Dim</div>
                          <div className="text-[9px] text-slate-400">
                            Dims and silences phone if assailant is watching
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSilentMode(!isSilentMode)}
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isSilentMode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isSilentMode ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveScreen('home')}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl mt-4"
                    >
                      Authenticate to Cancel Alarm
                    </button>
                  </div>
                )}

                {/* 5. DECOY CALCULATOR DISGUISE */}
                {activeScreen === 'calculator' && (
                  <div className="h-full flex flex-col justify-between pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-slate-500">Calculator</span>
                      <button
                        type="button"
                        onClick={() => setActiveScreen('home')}
                        className="text-[10px] text-slate-500 hover:text-white"
                        title="Return to CampusShield"
                      >
                        [Exit Decoy]
                      </button>
                    </div>

                    <div className="w-full bg-black/40 p-3 rounded-xl border border-slate-800 mb-3 text-right">
                      <div className="text-2xl font-mono font-bold text-white truncate">
                        {calcDisplay}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 flex-1">
                      {['C', '+/-', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map(
                        (btn, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleCalcPress(btn)}
                            className={`rounded-2xl font-bold text-sm flex items-center justify-center ${
                              btn === '0'
                                ? 'col-span-2 bg-slate-800 text-white'
                                : ['÷', '×', '-', '+', '='].includes(btn)
                                ? 'bg-amber-600 text-white'
                                : ['C', '+/-', '%'].includes(btn)
                                ? 'bg-slate-700 text-slate-200'
                                : 'bg-slate-800 text-white'
                            }`}
                            style={{ height: '46px' }}
                          >
                            {btn}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Phone Indicator Bar */}
              <div className="w-32 h-1 bg-slate-600 rounded-full mx-auto mt-2 shrink-0" />
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Simulator Controls & Architecture Notes */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-lg">📱</span>
              <span>Student Mobile Phone Interactive Controls</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Experience the dual-mode student application. Test each screen directly inside the phone bezel on the left.
            </p>

            {/* Quick Switch Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveScreen('home')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'home'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>🏠 Home Screen</div>
                <div className="text-[10px] font-normal opacity-70">Escrow status &amp; SOS</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('trip')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'trip'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>📍 Safe Trip</div>
                <div className="text-[10px] font-normal opacity-70">Radius &amp; deadline</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetCheckin();
                  setActiveScreen('checkin');
                }}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'checkin'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>🛡️ 3-Factor Check-In</div>
                <div className="text-[10px] font-normal opacity-70">Anti-coercion testing</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('sos')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'sos'
                    ? 'bg-red-600/20 border-red-500 text-red-300 ring-1 ring-red-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>🚨 SOS Active</div>
                <div className="text-[10px] font-normal opacity-70">Live dispatch stream</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('calculator')}
                className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  activeScreen === 'calculator'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 ring-1 ring-purple-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>🧮 Decoy Mode</div>
                <div className="text-[10px] font-normal opacity-70">Calculator disguise</div>
              </button>
            </div>
          </div>

          {/* Architecture Feature Cards */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Core Security &amp; Privacy Architecture
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>Zero-Surveillance Escrow</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  During safe trips, only rotating session tokens (e.g. <code>3b18e77a</code>) are transmitted. The university cannot snoop on student names or identities without an emergency trigger.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                  <span>🤫</span>
                  <span>Anti-Coercion 3-Password</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Students enter PIN, Pattern, and Passphrase in their personal order. Entering them in any duress order displays a normal &ldquo;Approved&rdquo; screen on the phone while dispatching police.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <span>🗺️</span>
                  <span>Day Trajectory Path</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When an emergency occurs, the security panel displays the student&rsquo;s full day movement history leading up to the incident trigger location.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="font-bold text-red-400 mb-1 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Dead Man&rsquo;s Switch</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  If the phone battery drops below 5% or loses signal, the app automatically pushes a final GPS ping and heading vector before shutting down.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
