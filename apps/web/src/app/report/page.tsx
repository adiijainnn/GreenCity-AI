'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Ward, GreenSpace } from '@/lib/types';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import {
  AlertTriangle, MapPin, Camera, CheckCircle2, Send, TreePine,
  Upload, X, ImageIcon, LogIn, UserPlus
} from 'lucide-react';
import Link from 'next/link';

function SubmitReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGSId = searchParams.get('green_space_id');
  const { activeRole, currentUser } = useAppStore();

  const [wards, setWards] = useState<Ward[]>([]);
  const [greenSpaces, setGreenSpaces] = useState<GreenSpace[]>([]);

  const [category, setCategory] = useState('Damaged Tree');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wardId, setWardId] = useState('');
  const [greenSpaceId, setGreenSpaceId] = useState(preselectedGSId || '');
  const [latitude, setLatitude] = useState(17.6599);
  const [longitude, setLongitude] = useState(75.9064);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);

  // Auth gate state
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getWards().catch(() => []),
      api.getGreenSpaces().catch(() => []),
    ]).then(([wardData, gsData]) => {
      setWards(wardData);
      setGreenSpaces(gsData);
      if (wardData.length > 0) setWardId(wardData[0].id);
    });
  }, []);

  // ── Image Helpers ─────────────────────────────────────────────
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Auth gate — block if not logged in
    if (!currentUser) {
      setShowAuthPrompt(true);
      return;
    }

    setSubmitting(true);
    try {
      // Use data URL as image or a placeholder if no image selected
      const imageToSend = imagePreview || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80';

      const payload = {
        category,
        title,
        description,
        ward_id: wardId,
        green_space_id: greenSpaceId || undefined,
        latitude,
        longitude,
        images: [imageToSend],
      };
      const res = await api.submitReport(payload);
      setSubmittedReport(res);
    } catch (err: any) {
      alert(err?.message || 'Error submitting report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Auth Prompt Modal ─────────────────────────────────────────
  if (showAuthPrompt) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <LogIn className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Login Required to Submit</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          To submit a complaint or issue report, you need to be logged in. This helps the municipal team contact you about your report.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Login to My Account
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Create Free Account
          </Link>
        </div>

        <button
          onClick={() => setShowAuthPrompt(false)}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          ← Go back to form
        </button>
      </div>
    );
  }

  // ── Success State ─────────────────────────────────────────────
  if (submittedReport) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Thank You for Your Report!</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your report reference number is <strong className="text-emerald-700 font-mono text-base">{submittedReport.report_number}</strong>.{' '}
          The Solapur Municipal Corporation team has received your submission and will inspect the location soon.
        </p>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-1.5">
          <p>• Category: <strong className="text-slate-800">{submittedReport.category}</strong></p>
          <p>• Title: <strong className="text-slate-800">{submittedReport.title}</strong></p>
          <p>• Status: <strong className="text-emerald-700">{submittedReport.status}</strong></p>
        </div>

        <div className="flex justify-center gap-3 pt-3">
          <Link
            href="/map"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Back to Green Map
          </Link>

          {activeRole === 'ADMIN' && (
            <Link
              href="/reports"
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              View in Admin Queue
            </Link>
          )}

          <button
            onClick={() => { setSubmittedReport(null); setTitle(''); setDescription(''); clearImage(); }}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  // ── Main Form ─────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

      <div className="space-y-1.5 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
          <TreePine className="w-3.5 h-3.5" />
          <span>Citizen Action</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Report a Park or Tree Issue</h1>
        <p className="text-sm text-slate-600">
          Help the Solapur municipal team keep our parks clean and green. Report broken trees, trash, or unmaintained gardens in just a minute.
        </p>

        {/* Not logged in — soft notice on top */}
        {!currentUser && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-amber-800">
              You are not logged in. You can fill the form, but you'll need to{' '}
              <Link href="/login" className="font-bold underline hover:text-amber-900">Login or Sign Up</Link>{' '}
              before submitting.
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">

        {/* Issue Type */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Type of Problem</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {[
              { id: 'Damaged Tree', label: 'Broken Tree' },
              { id: 'Trash & Littering', label: 'Garbage / Trash' },
              { id: 'Dry Grass / Unmaintained', label: 'Dry Grass' },
              { id: 'Encroachment', label: 'Illegal Cutting' },
            ].map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`py-2.5 px-3 rounded-xl border text-center font-semibold transition-all ${
                  category === cat.id
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Short Title</label>
          <input
            type="text"
            required
            placeholder="e.g., Fallen tree branch near walking track"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white border border-slate-300 text-sm text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        {/* Location Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">City Zone / Ward</label>
            <select
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              className="w-full bg-white border border-slate-300 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
            >
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Nearby Park (Optional)</label>
            <select
              value={greenSpaceId}
              onChange={(e) => setGreenSpaceId(e.target.value)}
              className="w-full bg-white border border-slate-300 text-xs text-slate-800 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
            >
              <option value="">-- General Street / Not inside a park --</option>
              {greenSpaces.map((gs) => (
                <option key={gs.id} value={gs.id}>{gs.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Detailed Description</label>
          <textarea
            rows={3}
            required
            placeholder="Describe the problem — exact location, how bad it is, how long it's been there..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-slate-300 text-sm text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase">Latitude</label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value))}
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg p-2 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase">Longitude</label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value))}
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg p-2 font-mono"
            />
          </div>
        </div>

        {/* ── IMAGE UPLOAD (Drag & Drop) ── */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Photo of the Problem (Optional)</span>
          </label>

          {imagePreview ? (
            /* Preview */
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <img
                src={imagePreview}
                alt="Selected photo"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-slate-700 hover:bg-red-50 hover:text-red-600 border border-slate-200 shadow-sm transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-slate-900/60 text-white text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {imageFile?.name}
              </div>
            </div>
          ) : (
            /* Drag & Drop Zone */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 w-full h-40 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-50/60'
                  : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <Upload className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">
                  {isDragging ? 'Drop your photo here' : 'Drag & drop a photo here'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  or <span className="text-emerald-700 font-semibold underline">click to browse</span> · JPG, PNG, WEBP
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span>Sending Report...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Issue to Municipal Team</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}

export default function SubmitReportPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Report Form...</div>}>
      <SubmitReportForm />
    </Suspense>
  );
}
