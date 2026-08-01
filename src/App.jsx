import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, setDoc, onSnapshot,
  addDoc, updateDoc, arrayUnion, getDoc, deleteDoc, deleteField
} from 'firebase/firestore';
import {
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged
} from 'firebase/auth';

// --- ICONS ---
import {
  Truck, User, MapPin, Navigation, Activity, Plus, CheckCircle2, 
  Clock, LogOut, ShieldCheck, Heart, Droplets, MessageSquare, Send,
  AlertTriangle, LayoutDashboard, BarChart3, FileText, Zap, Pill, 
  PhoneCall, Mic, Download, FileSpreadsheet, Thermometer, Wrench, 
  Siren, Wind, Sparkles, AlertCircle, Eye, EyeOff, History, 
  CalendarDays, Fingerprint, Stethoscope, BriefcaseMedical, Key, 
  Edit, Trash2, Smartphone, Camera, Rocket, Lock, Video, ImagePlus,
  WifiOff, Moon, Sun, Maximize, Minimize, UploadCloud, X
} from 'lucide-react';

const firebaseConfig = typeof __firebase_config !== 'undefined' && Object.keys(JSON.parse(__firebase_config)).length > 0 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyAeCeYQ0GXoeeIps2GjlDZi6uycs3LNuQo",
      authDomain: "si-elang-lebong.firebaseapp.com",
      projectId: "si-elang-lebong",
      storageBucket: "si-elang-lebong.firebasestorage.app",
      messagingSenderId: "565840248270",
      appId: "1:565840248270:web:d0d40daf955d8499d37f9f"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'si-elang-lebong';

const LOGO_URL = "https://drive.google.com/thumbnail?id=1OfzLSLR3RHwf3EQG4ETcdT9RFMTyB8CS&sz=w1000";
const APP_ICON_URL = "https://drive.google.com/thumbnail?id=1XOT6V9mHhCPnoDqEKQyKV6j9l4cCnE7p&sz=w512"; 

const RAW_SECRET_KEY = "AmbulanceProSecure2024!_MED_SECURE_SALT";

const getAESKey = async () => {
  if (!window.crypto || !window.crypto.subtle) throw new Error("No Crypto");
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.digest('SHA-256', enc.encode(RAW_SECRET_KEY));
  
  return await window.crypto.subtle.importKey(
   'raw', 
    keyMaterial, 
    { name: 'AES-GCM' }, 
    false, 
    ['encrypt', 'decrypt']
  );
};

const encryptData = async (text) => {
  if (!text) return text;
  try {
    if (!window.crypto || !window.crypto.subtle) return text;
    const key = await getAESKey();
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(text)
    );
    const ivArray = Array.from(iv);
    const cipherArray = Array.from(new Uint8Array(ciphertextBuffer));
    const combinedArray = ivArray.concat(cipherArray);
    return btoa(String.fromCharCode.apply(null, combinedArray));
  } catch (e) { 
    return text; 
  }
};

const decryptData = async (encryptedBase64) => {
  if (!encryptedBase64) return encryptedBase64;
  try {
    if (!window.crypto || !window.crypto.subtle) return encryptedBase64;
    const key = await getAESKey();
    const binaryStr = atob(encryptedBase64);
    const combinedArray = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combinedArray[i] = binaryStr.charCodeAt(i);
    }
    const iv = combinedArray.slice(0, 12);
    const ciphertextBuffer = combinedArray.slice(12);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertextBuffer
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (e) { 
    return encryptedBase64; 
  }
};

const maskSensitiveData = (text, role, status) => {
  if (!text) return "-";
  if (role === 'driver' && status === 'PENDING') {
    return text.substring(0, 3) + '***';
  }
  return text;
};

const hashPassword = async (password) => {
  try {
    if (!window.crypto || !window.crypto.subtle) return password;
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return password;
  }
};

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

const calculateEWS = (vitals) => {
  if (!vitals) return { score: 0, status: 'Aman', color: 'bg-emerald-500', text: 'text-emerald-600' };
  let score = 0;
  const hr = Number(vitals.hr) || 80; const spo2 = Number(vitals.spo2) || 98; const temp = Number(vitals.temp) || 36.5;
  if (hr <= 40 || hr >= 131) score += 3; else if (hr >= 111 || hr <= 50) score += 2; else if (hr >= 91) score += 1;
  if (spo2 <= 91) score += 3; else if (spo2 <= 93) score += 2; else if (spo2 <= 95) score += 1;
  if (temp <= 35.0) score += 3; else if (temp >= 39.1) score += 2; else if (temp <= 36.0 || (temp >= 38.1 && temp <= 39.0)) score += 1;
  if (score >= 7) return { score, status: 'Kritis (Tindakan Segera)', color: 'bg-red-600', text: 'text-red-600' };
  if (score >= 5) return { score, status: 'Waspada Tinggi', color: 'bg-orange-500', text: 'text-orange-500' };
  if (score >= 1) return { score, status: 'Perlu Perhatian', color: 'bg-yellow-500', text: 'text-yellow-500' };
  return { score, status: 'Kondisi Stabil', color: 'bg-emerald-500', text: 'text-emerald-600' };
};

const triggerDownload = async (blob, fileName) => {
  const cap = window.Capacitor;
  
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        const Filesystem = cap.Plugins.Filesystem;
        const Share = cap.Plugins.Share;
        
        if (Filesystem && Share) {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64data,
            directory: 'CACHE'
          });

          await Share.share({
            title: fileName,
            url: savedFile.uri,
            dialogTitle: 'Buka atau Simpan File Laporan'
          });
        } else {
          downloadFallback(blob, fileName);
        }
      };
      return; 
    } catch (e) {
      console.error("Native download error:", e);
      downloadFallback(blob, fileName);
    }
  } else {
    downloadFallback(blob, fileName);
  }
};

const downloadFallback = async (blob, fileName) => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
        });
        return;
      }
    } catch (e) {
      console.log("Share API failed", e);
    }
  }
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
};

const handleLogoError = (e) => {
  if (!e.target.dataset.triedLocal) {
    e.target.dataset.triedLocal = 'true';
    e.target.src = '/logo.png';
  } else {
    e.target.onerror = null;
    e.target.src = 'https://via.placeholder.com/300x100.png?text=SI-ELANG';
  }
};

const getSafeBase64Logo = async () => {
  try {
    const cdnUrl = `https://images.weserv.nl/?url=${encodeURIComponent(LOGO_URL)}&output=png`;
    const response = await fetch(cdnUrl);
    if (!response.ok) throw new Error('Gagal mengambil logo dari CDN');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        let res = reader.result;
        if (res && res.includes('base64,')) {
           const base64Data = res.split('base64,')[1];
           resolve(`data:image/png;base64,${base64Data}`);
        } else {
           resolve(null);
        }
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Logo gagal dimuat:", e);
    return null; 
  }
};

const NativeMapRender = ({ initialLat, initialLng, mapId, trackingId }) => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!window.L || !document.getElementById(mapId) || !initialLat || !initialLng) return;

    if (!mapRef.current) {
      mapRef.current = window.L.map(mapId).setView([initialLat, initialLng], 14);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapRef.current);
      
      const ambIcon = window.L.icon({ iconUrl: 'https://img.icons8.com/color/96/ambulance.png', iconSize: [45, 45], iconAnchor: [22, 22] });
      
      markerRef.current = window.L.marker([initialLat, initialLng], { icon: ambIcon }).addTo(mapRef.current).bindPopup("Ambulans Live").openPopup();
    }
  }, [initialLat, initialLng, mapId]);

  useEffect(() => {
    if (!trackingId || !window.L || !mapRef.current) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'live_gps', trackingId), (snap) => {
      if (snap.exists() && markerRef.current) {
        const pos = snap.data();
        mapRef.current.setView([pos.lat, pos.lng]);
        markerRef.current.setLatLng([pos.lat, pos.lng]);
      }
    });
    return () => unsub();
  }, [trackingId]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div id={mapId} className="w-full h-full z-0 relative rounded-2xl overflow-hidden"></div>;
};

const DEFAULT_USERS = {
  // Akun Inti / Manajemen
  'superadmin': { pass: 'superadmin123', role: 'superadmin', name: 'Super Administrator' },
  'admin': { pass: 'admin123', role: 'management', name: 'Kepala Ruangan / Manajemen' },
  
  // Akun Lama (Legacy)
  'driver1': { pass: 'driver123', role: 'driver', name: 'Driver1' },
  'nurse1': { pass: 'nurse123', role: 'nurse', name: 'Perawat' },
  'doctor1': { pass: 'doctor123', role: 'doctor', name: 'Dokter' },

  // Perawat Tambahan
  'perawat1': { pass: 'perawat123', role: 'nurse', name: 'Perawat 1' },
  'perawat2': { pass: 'perawat123', role: 'nurse', name: 'Perawat 2' },
  'perawat3': { pass: 'perawat123', role: 'nurse', name: 'Perawat 3' },
  'perawat4': { pass: 'perawat123', role: 'nurse', name: 'Perawat 4' },
  'perawat5': { pass: 'perawat123', role: 'nurse', name: 'Perawat 5' },
  'perawat6': { pass: 'perawat123', role: 'nurse', name: 'Perawat 6' },
  'perawat7': { pass: 'perawat123', role: 'nurse', name: 'Perawat 7' },
  'perawat8': { pass: 'perawat123', role: 'nurse', name: 'Perawat 8' },
  'perawat9': { pass: 'perawat123', role: 'nurse', name: 'Perawat 9' },
  'perawat10': { pass: 'perawat123', role: 'nurse', name: 'Perawat 10' },

  // Supir / Driver Tambahan
  'supir1': { pass: 'supir123', role: 'driver', name: 'Supir 1' },
  'supir2': { pass: 'supir123', role: 'driver', name: 'Supir 2' },
  'supir3': { pass: 'supir123', role: 'driver', name: 'Supir 3' },
  'supir4': { pass: 'supir123', role: 'driver', name: 'Supir 4' },
  'supir5': { pass: 'supir123', role: 'driver', name: 'Supir 5' },
  'supir6': { pass: 'supir123', role: 'driver', name: 'Supir 6' },
  'supir7': { pass: 'supir123', role: 'driver', name: 'Supir 7' },
  'supir8': { pass: 'supir123', role: 'driver', name: 'Supir 8' },
  'supir9': { pass: 'supir123', role: 'driver', name: 'Supir 9' },
  'supir10': { pass: 'supir123', role: 'driver', name: 'Supir 10' },

  // Dokter Tambahan
  'dokter1': { pass: 'dokter123', role: 'doctor', name: 'Dokter 1' },
  'dokter2': { pass: 'dokter123', role: 'doctor', name: 'Dokter 2' },
  'dokter3': { pass: 'dokter123', role: 'doctor', name: 'Dokter 3' }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState(null);
  const [view, setView] = useState('login');
  const [activeTrips, setActiveTrips] = useState([]);
  const [dailyCheck, setDailyCheck] = useState(null);
  const [nurseCheck, setNurseCheck] = useState(null);
  const [allDriverChecks, setAllDriverChecks] = useState([]); 
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState(false);
  
  const [chatInput, setChatInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [rejectedCalls, setRejectedCalls] = useState([]);
  const [installPrompt, setInstallPrompt] = useState(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [now, setNow] = useState(new Date());
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterMode, setFilterMode] = useState('month'); 
  const [historyFilter, setHistoryFilter] = useState(todayStr);
  const [historyServiceFilter, setHistoryServiceFilter] = useState('all');

  const [defaultTriage, setDefaultTriage] = useState('');
  const [selectedRS, setSelectedRS] = useState('');
  const [serviceType, setServiceType] = useState('rujukan');
  const [paymentStatus, setPaymentStatus] = useState('BPJS');

  const [appUsers, setAppUsers] = useState({});
  const [editUserMode, setEditUserMode] = useState(false);
  const [editingUsername, setEditingUsername] = useState('');
  const [userForm, setUserForm] = useState({ username: '', name: '', pass: '', role: 'nurse' });
  
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [activeTripToCancel, setActiveTripToCancel] = useState(null);

  const alarmAudio = useRef(null);
  const audioUnlocked = useRef(false);
  const notifiedTripId = useRef(null);
  const gpsErrorShown = useRef(false);
  const wakeLock = useRef(null);
  const bgKeepAlive = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const [fullScreenMapId, setFullScreenMapId] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const lastGpsUpdate = useRef(0);

  const performLogout = useCallback(() => { 
    localStorage.removeItem('si_elang_session');
    setView('login'); 
    setRole(null); 
    setUsername(null); 
    setSelectedTrip(null);
    setActiveTrips([]); 
    setShowLogoutConfirm(false);
    setFullScreenMapId(null);
    showToast('success', 'Sesi diakhiri secara aman.');
  }, []);

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('si_elang_session');
    if (savedSession) {
      try {
        const { u, role: savedRole } = JSON.parse(savedSession);
        setUsername(u);
        setRole(savedRole);
        setView(savedRole === 'superadmin' ? 'superadmin' : (savedRole === 'management' ? 'management' : 'home'));
      } catch (e) {
        localStorage.removeItem('si_elang_session');
      }
    }
  }, []);

  useEffect(() => {
    let inactivityTimeout;
    const resetTimer = () => {
      clearTimeout(inactivityTimeout);
      if (view !== 'login' && user) {
        inactivityTimeout = setTimeout(() => {
          performLogout();
          showToast('error', 'Sesi berakhir otomatis demi keamanan (12 Jam Inaktif).');
        }, 43200000); 
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(inactivityTimeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [view, user, performLogout]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (view !== 'login' && user) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [view, user]);


  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!window.L) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; document.head.appendChild(script);
    }

    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swCode = `
        self.addEventListener('notificationclick', function(event) {
          event.notification.close();
          event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
              if (windowClients.length > 0) return windowClients[0].focus();
              return clients.openWindow('/');
            })
          );
        });
        self.addEventListener('fetch', function(event) {});
      `;
      const blob = new Blob([swCode], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(blob);
      navigator.serviceWorker.register(swUrl).catch(() => {});
    }

    const manifestData = {
      name: "SI-ELANG Lebong", short_name: "SI-ELANG", start_url: ".", display: "standalone", background_color: "#ffffff", theme_color: "#dc2626",
      icons: [{ src: APP_ICON_URL, sizes: "512x512", type: "image/png", purpose: "any maskable" }]
    };
    const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) { manifestLink = document.createElement('link'); manifestLink.rel = 'manifest'; document.head.appendChild(manifestLink); }
    manifestLink.href = URL.createObjectURL(manifestBlob);

    const handleInstallPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (err) { }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    const intervalId = setInterval(() => setNow(new Date()), 60000);

    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
    audio.loop = true; alarmAudio.current = audio;

    const unlockAudio = () => {
      if (alarmAudio.current && !audioUnlocked.current) {
        alarmAudio.current.volume = 0;
        const playPromise = alarmAudio.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            alarmAudio.current.pause(); alarmAudio.current.currentTime = 0; alarmAudio.current.volume = 1; audioUnlocked.current = true;
            document.removeEventListener('click', unlockAudio); document.removeEventListener('touchstart', unlockAudio);
          }).catch(() => {});
        }
      }
    };
    document.addEventListener('click', unlockAudio); document.addEventListener('touchstart', unlockAudio);

    return () => { unsubscribe(); clearInterval(intervalId); document.removeEventListener('click', unlockAudio); document.removeEventListener('touchstart', unlockAudio); if (alarmAudio.current) alarmAudio.current.pause(); };
  }, []);

  useEffect(() => {
    if (!user) return; 

    const usersRef = doc(db, 'artifacts', appId, 'public', 'data', 'system_users', 'credentials');
    const unsubscribeUsers = onSnapshot(usersRef, (docSnap) => {
        if (docSnap.exists()) setAppUsers(docSnap.data()); 
        else { setDoc(usersRef, DEFAULT_USERS).catch((err) => console.error(err)); setAppUsers(DEFAULT_USERS); }
      }
    );

    return () => unsubscribeUsers();
  }, [user]);

  useEffect(() => {
    if (!user || !username) return; 
    
    let isSubscribed = true;
    let snapshotCounter = 0;

    const tripsRef = collection(db, 'artifacts', appId, 'public', 'data', 'trips');
    const unsubscribeTrips = onSnapshot(tripsRef, async (snapshot) => {
        snapshotCounter++;
        const currentCounter = snapshotCounter;

        const dataPromises = snapshot.docs.map(async (doc) => {
          const raw = doc.data(); 
          return { 
            ...raw, 
            id: doc.id, 
            patientName: await decryptData(raw.patientName) || raw.patientName, 
            diagnosis: await decryptData(raw.diagnosis) || raw.diagnosis 
          };
        });
        
        const data = await Promise.all(dataPromises);
        
        if (isSubscribed && currentCounter === snapshotCounter) {
            setActiveTrips(data);
        }
      }
    );

    return () => { 
        isSubscribed = false; 
        unsubscribeTrips(); 
    };
  }, [user, username]);

  useEffect(() => {
    if (!user || !user.uid || !username) return;
    
    const driverRef = doc(db, 'artifacts', appId, 'public', 'data', 'driver_checklists', `${username}_${todayStr}`);
    const nurseRef = doc(db, 'artifacts', appId, 'public', 'data', 'nurse_checklists', `${username}_${todayStr}`);
    
    const unSubDriver = onSnapshot(driverRef, (snap) => setDailyCheck(snap.exists() ? snap.data() : null));
    const unSubNurse = onSnapshot(nurseRef, (snap) => setNurseCheck(snap.exists() ? snap.data() : null));

    let unSubAllDrivers = () => {};
    if (role === 'management' || role === 'superadmin') {
      const allDriversColl = collection(db, 'artifacts', appId, 'public', 'data', 'driver_checklists');
      unSubAllDrivers = onSnapshot(allDriversColl, (snap) => {
        const checks = [];
        snap.forEach(doc => {
          if (doc.id.endsWith(todayStr)) checks.push({ id: doc.id, ...doc.data() });
        });
        setAllDriverChecks(checks);
      });
    }

    return () => { unSubDriver(); unSubNurse(); unSubAllDrivers(); };
  }, [user, username, todayStr, role]);

  useEffect(() => {
    const enableKeepAlive = async () => {
      if (role === 'driver' && dailyCheck) {
        if ('wakeLock' in navigator) try { wakeLock.current = await navigator.wakeLock.request('screen'); } catch (e) {}
        if (!bgKeepAlive.current) { bgKeepAlive.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'); bgKeepAlive.current.loop = true; bgKeepAlive.current.volume = 0.01; }
        bgKeepAlive.current.play().catch(()=>{});
      } else {
        if (wakeLock.current) { wakeLock.current.release().catch(()=>{}); wakeLock.current = null; }
        if (bgKeepAlive.current) { bgKeepAlive.current.pause(); bgKeepAlive.current = null; }
      }
    };
    enableKeepAlive();
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') enableKeepAlive(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { if (wakeLock.current) wakeLock.current.release().catch(()=>{}); if (bgKeepAlive.current) bgKeepAlive.current.pause(); document.removeEventListener('visibilitychange', handleVisibilityChange); }
  }, [role, dailyCheck]);

  useEffect(() => {
    if (role === 'driver' && user && dailyCheck) {
      const isBusy = activeTrips.some(t => t.status === 'OTW' && t.driverId === username);
      if (isBusy) { setIncomingCall(null); notifiedTripId.current = null; if (alarmAudio.current) alarmAudio.current.pause(); return; }

      const pendingTrips = activeTrips.filter(t => t.status === 'PENDING' && !rejectedCalls.includes(t.id));
      if (pendingTrips.length > 0) {
        const newCall = pendingTrips[0];
        setIncomingCall(newCall);
        
        if (alarmAudio.current && alarmAudio.current.paused && audioUnlocked.current) alarmAudio.current.play().catch(() => {});

        if (notifiedTripId.current !== newCall.id) {
          const titleText = newCall.serviceType === 'jenazah' ? '⚰️ MOBIL JENAZAH DIBUTUHKAN!' : '🚨 PANGGILAN DARURAT AMBULANS!';
          const safeName = newCall.patientName.substring(0, 3) + '***';
          const bodyText = `Pasien: ${safeName}\nRute: ${newCall.origin} -> ${newCall.destination}`;

          const cap = window.Capacitor;
          
          if (cap && cap.isNativePlatform() && cap.Plugins && cap.Plugins.LocalNotifications) {
            const LocalNotifications = cap.Plugins.LocalNotifications;
            
            LocalNotifications.requestPermissions().then((perm) => {
              if (perm.display === 'granted') {
                LocalNotifications.createChannel({
                  id: 'emergency-alarms',
                  name: 'Alarm Darurat SI-ELANG',
                  description: 'Notifikasi Panggilan Ambulans',
                  importance: 5,
                  visibility: 1, 
                  vibration: true
                }).then(() => {
                  LocalNotifications.schedule({
                    notifications: [{
                      title: titleText,
                      body: bodyText,
                      id: Math.floor(Math.random() * 100000),
                      channelId: 'emergency-alarms',
                      schedule: { at: new Date(Date.now() + 500) } 
                    }]
                  });
                });
              }
            });
          } 
          else if ('Notification' in window && Notification.permission === 'granted') {
            if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(sw => sw.showNotification(titleText, { body: bodyText, icon: LOGO_URL, vibrate: [500, 250, 500, 250, 1000], requireInteraction: true, tag: 'emergency-call', renotify: true })).catch(()=>{});
            else { const notif = new Notification(titleText, { body: bodyText, icon: LOGO_URL, requireInteraction: true }); notif.onclick = () => { window.focus(); notif.close(); }; }
          }
          
          notifiedTripId.current = newCall.id;
        }
      } else {
        setIncomingCall(null); notifiedTripId.current = null;
        if (alarmAudio.current) { alarmAudio.current.pause(); alarmAudio.current.currentTime = 0; }
      }
    }
  }, [activeTrips, role, user, dailyCheck, rejectedCalls]);

  const activeTripId = activeTrips.find(t => t.status === 'OTW' && t.driverId === username)?.id;
  
  useEffect(() => {
    let watchId;
    if (role === 'driver' && activeTripId && user && isOnline) {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            const now = Date.now();
            if (now - lastGpsUpdate.current < 5000) return;

            try { 
              lastGpsUpdate.current = now;
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'live_gps', activeTripId), { 
                lat: pos.coords.latitude, 
                lng: pos.coords.longitude,
                updatedAt: new Date().toISOString()
              }); 
            } catch (err) {}
          },
          (error) => {
            if (!gpsErrorShown.current) {
              let errorMsg = "Sinyal GPS lemah atau tidak ditemukan.";
              if (error.code === 1) errorMsg = "Akses Lokasi (GPS) diblokir oleh HP/Browser. Mohon izinkan!";
              alert(`Peringatan GPS:\n${errorMsg}`);
              gpsErrorShown.current = true;
            }
          }, 
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      } else {
        alert("Browser Anda tidak mendukung fitur Lokasi/GPS.");
      }
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [role, activeTripId, user, isOnline]);

  useEffect(() => {
    if (selectedTrip && activeTrips.length > 0) {
      const updated = activeTrips.find(t => t.id === selectedTrip.id);
      if (updated) setSelectedTrip(updated);
    }
  }, [activeTrips]);

  const showToast = (type, text, timeout = 3000) => { setMsg({ type, text }); setTimeout(() => setMsg(null), timeout); };

  const handleLogin = async (e) => {
    e.preventDefault();
    const u = e.target.username.value.toLowerCase().replace(/\s/g, '');
    const p = e.target.password.value;
    const userFound = appUsers[u] || DEFAULT_USERS[u];

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') Notification.requestPermission();

    if (userFound) {
      const hashedInput = await hashPassword(p);
      if (userFound.pass === hashedInput || userFound.pass === p) {
        localStorage.setItem('si_elang_session', JSON.stringify({ u, role: userFound.role }));
        
        setUsername(u); setRole(userFound.role);
        setView(userFound.role === 'superadmin' ? 'superadmin' : (userFound.role === 'management' ? 'management' : 'home'));
        showToast('success', `Login Berhasil! Selamat datang, ${userFound.name}.`);
        return;
      }
    }
    showToast('error', 'Akses Ditolak! Username atau Password salah.');
  };

  const saveUserAccount = async (e) => {
    e.preventDefault(); if (!user) return;
    const targetUsername = userForm.username.toLowerCase().replace(/\s/g, '');
    if ((!editUserMode || (editUserMode && targetUsername !== editingUsername)) && (appUsers[targetUsername] || DEFAULT_USERS[targetUsername])) { showToast('error', 'Username sudah digunakan oleh akun lain!'); return; }

    let finalPassword = userForm.pass || '';
    if (!finalPassword && editUserMode) finalPassword = appUsers[editingUsername]?.pass || '';
    else if (finalPassword && finalPassword.length !== 64) finalPassword = await hashPassword(finalPassword);

    try {
        const credentialsRef = doc(db, 'artifacts', appId, 'public', 'data', 'system_users', 'credentials');
        
        if (editUserMode && targetUsername !== editingUsername) {
            await updateDoc(credentialsRef, {
                [editingUsername]: deleteField()
            });
        }
        
        await setDoc(credentialsRef, { 
            [targetUsername]: { name: userForm.name, role: userForm.role, pass: finalPassword } 
        }, { merge: true });

        showToast('success', 'Data Pengguna Berhasil Diperbarui!');
        setEditUserMode(false); setEditingUsername(''); setUserForm({ username: '', name: '', pass: '', role: 'nurse' });
        setIsMobileFormOpen(false); 
    } catch(err) {
        showToast('error', 'Terjadi kesalahan saat menyimpan data.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!user || !userToDelete) return;
    if (userToDelete === 'superadmin') { showToast('error', 'Akun Super Admin Utama tidak bisa dihapus!'); setUserToDelete(null); return; }
    
    try {
        const credentialsRef = doc(db, 'artifacts', appId, 'public', 'data', 'system_users', 'credentials');
        await updateDoc(credentialsRef, {
            [userToDelete]: deleteField()
        });

        showToast('success', `Akun ${userToDelete} berhasil dihapus!`);
        
        if(editUserMode && editingUsername === userToDelete) {
            setEditUserMode(false);
            setEditingUsername('');
            setUserForm({ username: '', name: '', pass: '', role: 'nurse' });
            setIsMobileFormOpen(false);
        }
        setUserToDelete(null);
    } catch (err) {
        showToast('error', 'Terjadi kesalahan saat menghapus data.');
    }
  };

  const deleteUserAccount = (uname) => {
    setUserToDelete(uname);
  };

  const editUserAccount = (uname, data) => { 
      setEditUserMode(true); 
      setEditingUsername(uname); 
      setUserForm({ ...data, username: uname, pass: '' }); 
      setIsMobileFormOpen(true); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const startDictation = (targetSelector) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast('error', 'Browser tidak mendukung Voice-to-Text.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    showToast('success', 'Mendengarkan suara... (Bicara sekarang)');
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if(targetSelector === 'chat') {
        setChatInput(prev => prev + " " + transcript);
      } else {
        const input = document.querySelector(targetSelector);
        if(input) input.value = input.value + " " + transcript;
      }
      showToast('success', 'Teks berhasil disalin!');
    };
    recognition.start();
  };

  const handleDailyCheck = async (e) => {
    e.preventDefault(); if (!user) return; setLoading(true);
    const formData = new FormData(e.target);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'driver_checklists', `${username}_${todayStr}`), {
        driverId: username, driverName: formData.get('driverName'), timestamp: new Date().toISOString(), status: 'READY',
        kendaraan: { fuel: formData.get('fuel'), lampuSirine: formData.get('lampuSirine'), banRem: formData.get('banRem'), akiMesin: formData.get('akiMesin') },
        medis: { oxygen: formData.get('oxygen'), stretcher: formData.get('stretcher'), apar: formData.get('apar'), kebersihan: formData.get('kebersihan') }
      });
      showToast('success', 'Formulir Kesiapan Armada Tersimpan!');
    } catch (err) {} finally { setLoading(false); }
  };

  const handleNurseCheck = async (e) => {
    e.preventDefault(); if (!user) return; setLoading(true);
    const formData = new FormData(e.target);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'nurse_checklists', `${username}_${todayStr}`), {
        nurseId: username, nurseName: formData.get('nurseName'), timestamp: new Date().toISOString(), status: 'READY',
        obat: { emergency: formData.get('obatEmergency'), cairan: formData.get('cairanInfus') },
        apd: { handscoon: formData.get('handscoon'), masker: formData.get('masker') }
      });
      showToast('success', 'Inspeksi Kesiapan Medis Tersimpan!');
    } catch (err) {} finally { setLoading(false); }
  };

  const createNewTrip = async (e) => {
    e.preventDefault(); 
    if (!isOnline) { showToast('error', 'OFFLINE: Form disimpan lokal sementara.'); return; }
    if (!user) return; setLoading(true);
    
    const formData = new FormData(e.target);
    let finalDestination = serviceType === 'jenazah' ? formData.get('jenazahDestination') : formData.get('destination');
    if (serviceType === 'rujukan' && finalDestination === 'Lainnya') finalDestination = formData.get('customDestination') || 'RS Tidak Diketahui';

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'trips'), {
        patientName: await encryptData(formData.get('patientName')) || "", 
        diagnosis: await encryptData(formData.get('diagnosis')) || "",
        age: formData.get('age') || 0, gender: formData.get('gender') || "",
        triage: serviceType === 'jenazah' ? 'Hitam' : (formData.get('triage') || "Hijau"), eConsent: formData.get('eConsent') === 'on', 
        origin: formData.get('origin') || "", destination: finalDestination || "",
        dpjp: formData.get('dpjp') || '-', nurse: nurseCheck?.nurseName || 'Perawat Jaga',
        creatorId: username, 
        serviceType: serviceType || "rujukan", paymentStatus: paymentStatus || "UMUM", 
        driver: 'Mencari Driver...', driverId: null, status: 'PENDING',
        startTime: new Date().toISOString(), vitals: { hr: 80, bp: "120/80", spo2: 98, temp: 36.5 },
        instructions: [], photo: "https://via.placeholder.com/400x300?text=Resume+Medis"
      });
      setView('home'); setServiceType('rujukan'); setPaymentStatus('BPJS'); setDefaultTriage('');
      showToast('success', 'Permintaan Aktif! Sistem sedang memanggil Driver...');
    } catch (err) {} finally { setLoading(false); }
  };

  const acceptCall = async (trip) => {
    if (!user) return; setLoading(true);
    try {
      const tripRef = doc(db, 'artifacts', appId, 'public', 'data', 'trips', trip.id);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists() && tripSnap.data().status !== 'PENDING') {
        setIncomingCall(null); if (alarmAudio.current) { alarmAudio.current.pause(); alarmAudio.current.currentTime = 0; }
        showToast('error', 'Keduluan! Panggilan ini sudah diambil driver lain.'); setLoading(false); return;
      }

      if (alarmAudio.current) { alarmAudio.current.pause(); alarmAudio.current.currentTime = 0; }
      setIncomingCall(null);

      await updateDoc(tripRef, { status: 'OTW', driverId: username, driver: dailyCheck?.driverName || 'Driver Utama' });
      setSelectedTrip({ ...trip, status: 'OTW', driverId: username, driver: dailyCheck?.driverName || 'Driver Utama' });
      setView('tripDetail'); showToast('success', 'Tugas Diterima! Data pasien telah dibuka.', 4000);
    } catch (err) {} finally { setLoading(false); }
  };

  const handleRejectCall = (tripId) => {
    setRejectedCalls(prev => [...prev, tripId]); setIncomingCall(null);
    if (alarmAudio.current) { alarmAudio.current.pause(); alarmAudio.current.currentTime = 0; }
  };

  const handleUpdateTTV = async (e) => {
    e.preventDefault(); if (!user || !selectedTrip) return; setLoading(true);
    const f = new FormData(e.target);
    const vitals = { hr: f.get('hr'), spo2: f.get('spo2'), bp: f.get('bp'), temp: f.get('temp') };
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', selectedTrip.id), {
        'vitals.hr': vitals.hr, 'vitals.spo2': vitals.spo2, 'vitals.bp': vitals.bp, 'vitals.temp': vitals.temp
      });
      const ews = calculateEWS(vitals);
      postInstruction(`Laporan TTV: HR ${vitals.hr} | SpO2 ${vitals.spo2}% | Tensi ${vitals.bp} | Suhu ${vitals.temp}°C \n[Sistem EWS: Skor ${ews.score} - ${ews.status}]`, 'ACTION');
      showToast('success', 'TTV & EWS berhasil diperbarui!');
    } catch (err) {} finally { setLoading(false); }
  };

  const handlePhotoUpload = async (e, fieldType) => {
    if (!user || !selectedTrip || !e.target.files[0]) return; setLoading(true); showToast('success', 'Mengompres foto...');
    try {
      const b64 = await compressImage(e.target.files[0]);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', selectedTrip.id), { [fieldType]: b64 });
      setSelectedTrip(prev => ({ ...prev, [fieldType]: b64 }));
      showToast('success', 'Foto berhasil diunggah!');
    } catch (err) { showToast('error', 'Gagal memproses foto.'); } finally { setLoading(false); }
  };

  const removeOdometerPhoto = async (fieldType) => {
    if (!user || !selectedTrip) return; 
    setLoading(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', selectedTrip.id), { [fieldType]: null });
      setSelectedTrip(prev => ({ ...prev, [fieldType]: null }));
      showToast('success', 'Foto odometer berhasil dihapus.');
    } catch (err) { 
      showToast('error', 'Gagal menghapus foto.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleKMValueChange = async (fieldType, value) => {
    if (!user || !selectedTrip || value === '') return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', selectedTrip.id), { [fieldType]: Number(value) });
      setSelectedTrip(prev => ({ ...prev, [fieldType]: Number(value) }));
    } catch (err) {}
  };

  const handleChatImageUpload = async (e) => {
    const file = e.target.files[0]; if (!user || !selectedTrip || !file) return;
    setLoading(true); showToast('success', 'Mempersiapkan foto chat...');
    try {
      const b64 = await compressImage(file);
      await postInstruction('📸 Lampiran Foto', 'CHAT', b64);
      showToast('success', 'Foto terkirim!');
    } catch (err) { showToast('error', 'Gagal mengirim foto.'); } finally { setLoading(false); e.target.value = null; }
  };

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); } 
    else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream); audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); const reader = new FileReader();
          reader.onloadend = () => { postInstruction('🎤 Pesan Suara', 'AUDIO', null, reader.result); };
          reader.readAsDataURL(audioBlob); mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorderRef.current.start(); setIsRecording(true);
      } catch (err) { showToast('error', 'Gagal akses mikrofon.'); }
    }
  };

  const postInstruction = async (text, msgType = 'CHAT', imageBase64 = null, audioBase64 = null) => {
    if (!user || !selectedTrip || (!text && !imageBase64 && !audioBase64)) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', selectedTrip.id), {
        instructions: arrayUnion({
          text: text || "", type: msgType, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: role === 'doctor' ? 'DOKTER' : (role === 'nurse' ? 'PERAWAT' : (role === 'management' ? 'MANAJEMEN' : (role ? role.toUpperCase() : 'SISTEM'))),
          image: imageBase64 || null, audio: audioBase64 || null
        })
      });
    } catch (err) { }
  };

  const finishTrip = async (id) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', id), { status: 'COMPLETED', endTime: new Date().toISOString() });
    setSelectedTrip(null); setView('home'); showToast('success', 'Tugas Selesai. Tersimpan di Riwayat.', 4000);
  };

  const confirmDeleteHistory = async () => {
    if (!tripToDelete || !user) return;
    setLoading(true);
    try {
       await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', tripToDelete.id));
       showToast('success', 'Riwayat rujukan berhasil dihapus permanen.');
       setTripToDelete(null);
    } catch(err) {
       showToast('error', 'Gagal menghapus riwayat rujukan.');
    } finally {
       setLoading(false);
    }
  };

  const confirmCancelActiveTrip = async () => {
    if (!activeTripToCancel || !user) return;
    setLoading(true);
    try {
       await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', activeTripToCancel.id));
       showToast('success', 'Rujukan aktif berhasil dibatalkan dan dihapus.');
       setActiveTripToCancel(null);
       
       if (selectedTrip?.id === activeTripToCancel.id) {
           setSelectedTrip(null);
           setView('home');
       }
    } catch(err) {
       showToast('error', 'Gagal membatalkan rujukan.');
    } finally {
       setLoading(false);
    }
  };

  const getDuration = (startIso, endIso) => {
    if (!startIso) return '--'; const s = new Date(startIso); const e = endIso ? new Date(endIso) : now; return Math.floor((e - s) / 60000);
  };

  const getTriageColor = (t) => {
    if (t === 'Merah') return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500' };
    if (t === 'Kuning') return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-500' };
    if (t === 'Hijau') return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-500' };
    if (t === 'Hitam') return { bg: 'bg-slate-800', text: 'text-slate-100', border: 'border-slate-700' };
    return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
  };

  const filteredHistory = useMemo(() => {
    const filtered = activeTrips.filter(t => {
      const matchStatus = t.status === 'COMPLETED';
      const datePrefix = filterMode === 'month' ? historyFilter.substring(0, 7) : historyFilter;
      const matchDate = (!t.startTime || t.startTime.startsWith(datePrefix));
      const matchService = (historyServiceFilter === 'all' || (t.serviceType || 'rujukan') === historyServiceFilter);
      let matchRole = true;
      if (role === 'driver') matchRole = t.driverId === username;
      if (role === 'nurse') matchRole = !t.creatorId || t.creatorId === username;
      return matchStatus && matchDate && matchService && matchRole;
    });
    return filtered.sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return timeA - timeB;
    });
  }, [activeTrips, historyFilter, filterMode, historyServiceFilter, role, username]);

  const visibleTrips = useMemo(() => activeTrips.filter(t => {
    if (t.status === 'PENDING') return true; 
    if (t.status === 'OTW') {
       if (role === 'driver') return t.driverId === username;
       if (role === 'nurse') return !t.creatorId || t.creatorId === username;
       return true; 
    }
    return false;
  }), [activeTrips, role, username]);

  const exportToExcel = async () => {
    if (!filteredHistory.length) { showToast('error', 'Tidak ada data diunduh.'); return; }
    showToast('success', 'Menyusun dokumen Excel...');
    try {
      let periodeTeks = '';
      if (filterMode === 'month') {
        const [y, m] = historyFilter.split('-');
        const dateObj = new Date(y, m - 1);
        periodeTeks = 'BULAN ' + dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
      } else {
        const dateObj = new Date(historyFilter);
        periodeTeks = 'TANGGAL ' + dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
      }
      
      let judulUtama = 'REKAPITULASI LAYANAN AMBULANS';
      if (historyServiceFilter === 'rujukan') judulUtama = 'REKAPITULASI RUJUKAN';
      else if (historyServiceFilter === 'jenazah') judulUtama = 'REKAPITULASI PENGANTARAN JENAZAH';

      const logoBase64 = await getSafeBase64Logo();
      const logoHtml = logoBase64 ? `<img src="${logoBase64}" height="60" style="margin-bottom: 10px;" />` : `<h2 style="color: #1e3a8a; font-size: 26px; font-weight: 900; letter-spacing: 2px; margin-bottom: 10px;">SI-ELANG</h2>`;

      const table = document.createElement('table'); table.setAttribute('border', '1');
      let html = `<thead>
        <tr><th colspan="18" style="text-align:center; border:none;">${logoHtml}</th></tr>
        <tr><th colspan="18" style="text-align:center; font-size:18px; font-weight:bold; border:none;">${judulUtama}</th></tr>
        <tr><th colspan="18" style="text-align:center; font-size:14px; font-weight:bold; border:none;">${periodeTeks}</th></tr>
        <tr><th colspan="18" style="text-align:center; font-size:14px; font-weight:bold; border:none;">RSUD LEBONG</th></tr>
        <tr><th colspan="18" style="border:none;"></th></tr>
        <tr>
        <th style="font-weight:bold; background-color:#f1f5f9; text-align:center;">No</th><th style="font-weight:bold; background-color:#f1f5f9;">Tanggal</th>
        <th style="font-weight:bold; background-color:#f1f5f9;">Berangkat</th><th style="font-weight:bold; background-color:#f1f5f9;">Tiba</th>
        <th style="font-weight:bold; background-color:#f1f5f9;">Layanan</th><th style="font-weight:bold; background-color:#f1f5f9;">Biaya</th>
        <th style="font-weight:bold; background-color:#f1f5f9;">Pasien</th><th style="font-weight:bold; background-color:#f1f5f9;">Keterangan</th>
        <th style="font-weight:bold; background-color:#f1f5f9;">Asal</th><th style="font-weight:bold; background-color:#f1f5f9;">Tujuan</th>
        <th style="font-weight:bold; background-color:#f1f5f9;">Perawat</th><th style="font-weight:bold; background-color:#f1f5f9;">Driver</th>
        <th style="font-weight:bold; background-color:#f1f5f9;">DPJP</th><th style="font-weight:bold; background-color:#f1f5f9; text-align:center;">KM Total</th>
        <th style="font-weight:bold; background-color:#f1f5f9; text-align:center;">Input Manual</th><th style="font-weight:bold; background-color:#f1f5f9; text-align:center;">Bukti Foto KM</th>
        <th style="font-weight:bold; background-color:#f1f5f9; text-align:center;">Berkas</th>
        <th style="font-weight:bold; background-color:#f1f5f9; text-align:center;">Durasi(M)</th>
      </tr></thead><tbody>`;
      filteredHistory.forEach((t, i) => {
        const imgAwal = t.kmStartPhoto ? `<img src="${t.kmStartPhoto}" width="80" height="80" />` : ''; const imgAkhir = t.kmEndPhoto ? `<img src="${t.kmEndPhoto}" width="80" height="80" />` : '';
        const berkasText = t.referralDocs?.length ? `${t.referralDocs.length} File` : (t.referralDoc ? '1 File' : 'N/A');
        html += `<tr>
          <td style="text-align:center;">${i + 1}</td><td>${new Date(t.startTime).toLocaleDateString('id-ID')}</td><td>${new Date(t.startTime).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</td>
          <td>${t.endTime ? new Date(t.endTime).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-'}</td><td>${t.serviceType === 'jenazah' ? 'Jenazah' : 'Rujukan'}</td>
          <td>${t.paymentStatus || 'UMUM'}</td><td>${t.patientName}</td><td>${t.diagnosis}</td><td>${t.origin}</td><td>${t.destination}</td>
          <td>${t.nurse}</td><td>${t.driver}</td><td>${t.dpjp}</td><td style="text-align:center;">${(t.kmEndValue && t.kmStartValue) ? (t.kmEndValue - t.kmStartValue) : '-'}</td>
          <td style="text-align:center;">${t.kmStartValue || '-'} s/d ${t.kmEndValue || '-'}</td><td style="text-align:center; vertical-align:middle; height:90px;">${imgAwal}${imgAkhir}</td>
          <td style="text-align:center;">${berkasText}</td>
          <td style="text-align:center;">${getDuration(t.startTime, t.endTime)}</td>
        </tr>`;
      });
      html += `</tbody>`; table.innerHTML = html;
      
      const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Riwayat Layanan</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>';
      const htmlString = template.replace('{table}', table.innerHTML);
      const blob = new Blob([htmlString], { type: 'application/vnd.ms-excel' });
      
      await triggerDownload(blob, `Rekap_${historyFilter}.xls`);
      showToast('success', 'Excel berhasil diunduh!');
    } catch (err) { showToast('error', 'Gagal membuat file Excel.'); }
  };

  const exportToPDF = async () => {
    if (!filteredHistory.length) { showToast('error', 'Tidak ada data diunduh.'); return; }
    showToast('success', 'Menyusun dokumen PDF...');
    try {
      if (!window.jspdf) {
        const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        await new Promise((res) => { script.onload = res; document.head.appendChild(script); });
      }
      
      if (!window.jsPDF) {
        window.jsPDF = window.jspdf.jsPDF;
      }

      if (!window.jsPDF.API.autoTable) {
        const script2 = document.createElement('script'); script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js';
        await new Promise((res) => { script2.onload = res; document.head.appendChild(script2); });
      }

      const { jsPDF } = window.jspdf; const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoBase64 = await getSafeBase64Logo();

      if (logoBase64) {
        try { doc.addImage(logoBase64, 'PNG', 14, 10, 45, 15); } catch(e) {
            doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138); doc.text('SI-ELANG', 14, 20);
        }
      } else {
        doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138); doc.text('SI-ELANG', 14, 20);
      }

      let judulUtama = 'REKAPITULASI LAYANAN AMBULANS';
      if (historyServiceFilter === 'rujukan') judulUtama = 'REKAPITULASI RUJUKAN';
      else if (historyServiceFilter === 'jenazah') judulUtama = 'REKAPITULASI PENGANTARAN JENAZAH';

      let periodeTeks = '';
      if (filterMode === 'month') {
        const [y, m] = historyFilter.split('-');
        const dateObj = new Date(y, m - 1);
        periodeTeks = 'BULAN ' + dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
      } else {
        const dateObj = new Date(historyFilter);
        periodeTeks = 'TANGGAL ' + dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
      }

      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138); 
      doc.text(judulUtama, pageWidth / 2, 16, { align: 'center' });
      
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
      doc.text(periodeTeks, pageWidth / 2, 22, { align: 'center' });
      
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138); 
      doc.text('RSUD LEBONG', pageWidth / 2, 28, { align: 'center' });

      const head = [['NO', 'NAMA DRIVER', 'PERAWAT/BIDAN', 'PASIEN / JENAZAH', 'TANGGAL', 'RUANGAN ASAL', 'TUJUAN PENGANTARAN', 'TOTAL KM', 'MANUAL\n(AWAL-AKHIR)', 'FOTO KM\nODOMETER', 'BERKAS\nRUJUKAN', 'DURASI']];
      const body = filteredHistory.map((t, i) => {
        const date = new Date(t.startTime).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
        const totalKm = (t.kmEndValue && t.kmStartValue) ? String(t.kmEndValue - t.kmStartValue) : '-';
        const manualKm = `${t.kmStartValue || '-'}\ns/d\n${t.kmEndValue || '-'}`; 
        const durasi = `${getDuration(t.startTime, t.endTime)} Mnt`;
        const namaPasien = `${t.patientName}\n(Ket: ${t.diagnosis})`;
        
        return [ i + 1, t.driver, t.nurse, namaPasien, date, t.origin, t.destination, totalKm, manualKm, '', '', durasi ];
      });

      doc.autoTable({
        startY: 40, head: head, body: body, theme: 'grid',
        rowPageBreak: 'avoid',
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle', font: 'helvetica', lineWidth: 0.2, lineColor: [150, 150, 150] },
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 7: { halign: 'center' }, 8: { halign: 'center' }, 9: { cellWidth: 32, minCellHeight: 18 }, 10: { cellWidth: 32, minCellHeight: 18 }, 11: { halign: 'center' } },
        
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 10) {
            const trip = filteredHistory[data.row.index];
            if (!trip) return;
            const numDocs = trip.referralDocs ? trip.referralDocs.length : (trip.referralDoc ? 1 : 0);
            if (numDocs > 2) {
              const rowsNeeded = Math.ceil(numDocs / 2);
              data.cell.styles.minCellHeight = (rowsNeeded * 16) + 4; 
            }
          }
        },
        
        didDrawCell: function(data) {
          if (data.section === 'body') { 
            const trip = filteredHistory[data.row.index]; 
            if (!trip) return;
            let xPos = data.cell.x + 2; let yPos = data.cell.y + 2; let imgSize = 14;
            
            if (data.column.index === 9) {
              if (trip.kmStartPhoto) { try { doc.addImage(trip.kmStartPhoto, 'JPEG', xPos, yPos, imgSize, imgSize); } catch(e) {} }
              if (trip.kmEndPhoto) { try { doc.addImage(trip.kmEndPhoto, 'JPEG', xPos + imgSize + 2, yPos, imgSize, imgSize); } catch(e) {} }
            }
            
            if (data.column.index === 10) {
              let startX = xPos;
              let currentX = startX;
              let currentY = yPos;
              
              if (trip.referralDocs && trip.referralDocs.length > 0) {
                let count = 0;
                for (let docItem of trip.referralDocs) {
                  if (count > 0 && count % 2 === 0) {
                    currentX = startX;
                    currentY += imgSize + 2;
                  }
                  const isImage = (docItem.type && docItem.type.startsWith('image/')) || (docItem.url && docItem.url.startsWith('data:image'));
                  if (isImage) {
                    try { doc.addImage(docItem.url, 'JPEG', currentX, currentY, imgSize, imgSize); } catch(e) {}
                  } else {
                    doc.setFontSize(7); doc.setTextColor(0, 0, 255); doc.text("PDF", currentX + 3, currentY + 8);
                  }
                  currentX += imgSize + 2; count++;
                }
              } else if (trip.referralDoc) {
                const isOldImage = (trip.referralDocType && trip.referralDocType.startsWith('image/')) || (trip.referralDoc && trip.referralDoc.startsWith('data:image'));
                if (isOldImage) {
                  try { doc.addImage(trip.referralDoc, 'JPEG', currentX, currentY, imgSize, imgSize); } catch(e) {}
                } else {
                  doc.setFontSize(7); doc.setTextColor(0, 0, 255); doc.text("PDF", currentX + 3, currentY + 8);
                }
              }
            }
          }
        }
      });

      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Dicetak secara otomatis oleh Sistem SI-ELANG pada ${new Date().toLocaleString('id-ID')}`, 14, doc.internal.pageSize.height - 10); }
      
      const pdfBlob = doc.output('blob');
      await triggerDownload(pdfBlob, `Laporan_SI-ELANG_${historyFilter}.pdf`);
      showToast('success', 'PDF berhasil diunduh!');
    } catch (err) { 
      console.error("Cetak PDF Error:", err);
      showToast('error', 'Gagal membuat PDF. Silakan coba kembali.'); 
    }
  };

  const MessageToast = () => msg && (
    <div className="fixed top-4 right-4 z-[100] flex justify-end pointer-events-none w-auto lg:w-96">
      <div className={`w-full p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-right pointer-events-auto text-white ${msg.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-red-600 border border-red-500'}`}>
        <div className="flex-shrink-0 mt-0.5">{msg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div>
        <p className="font-bold text-sm leading-snug break-words flex-1">{msg.text}</p>
      </div>
    </div>
  );

  const renderChatPanel = () => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col w-full h-[600px] lg:h-[70vh]">
      <div className="p-5 border-b bg-slate-50 flex justify-between items-center rounded-t-[2.5rem]">
        <div>
          <h3 className="text-sm font-black uppercase text-blue-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" /> KOORDINASI KLINIS
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Terhubung Live
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="tel:119" title="Panggilan Suara" className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-emerald-600 transition-colors"><PhoneCall size={18} /></a>
          <a href="https://wa.me/?text=Halo%20Tim%20Medis%20SI-ELANG,%20mohon%20koordinasi%20pasien." target="_blank" rel="noopener noreferrer" title="Video Call WA" className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-emerald-600 transition-colors"><Video size={18} /></a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
        {selectedTrip?.instructions?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-blue-900 py-10">
            <MessageSquare size={48} className="mb-3 text-slate-300" />
            <p className="text-xs font-bold uppercase tracking-widest">Ruang Koordinasi Kosong</p>
          </div>
        ) : (
          selectedTrip?.instructions?.map((ins, i) => {
            const isDoctor = ins.sender === 'DOKTER IGD ASAL';
            let bubbleStyle = isDoctor ? 'bg-indigo-600 text-white rounded-tl-none shadow-md' : 'bg-white border-slate-200 text-slate-800 rounded-tr-none border';
            let icon = null;
            
            if (ins.type === 'ACTION') { bubbleStyle = 'bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl'; icon = <Zap size={14} className="text-blue-500" />; }
            if (ins.type === 'HANDOVER') { bubbleStyle = 'bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl border-l-4 border-l-emerald-500'; icon = <ShieldCheck size={14} className="text-emerald-500" />; }
            
            return (
              <div key={i} className={`flex flex-col ${isDoctor ? 'items-start' : 'items-end'}`}>
                <div className={`p-4 max-w-[85%] ${bubbleStyle}`}>
                  <div className="flex items-center gap-2 mb-1.5">{icon}<p className={`text-[9px] font-black uppercase tracking-widest ${isDoctor ? 'text-indigo-200' : 'opacity-60'}`}>{ins.sender}</p></div>
                  {ins.image && (<div className="mb-2"><img src={ins.image} alt="Lampiran" className="w-full max-w-[250px] h-auto rounded-xl border border-black/10 shadow-sm hover:scale-[1.8] origin-center transition-transform z-10 relative cursor-pointer re-invert" /></div>)}
                  {ins.audio && (<div className="mb-2"><audio controls src={ins.audio} className="w-full max-w-[250px] h-10 rounded-lg outline-none re-invert" /></div>)}
                  {ins.text && <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap">{ins.text}</p>}
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase px-1">{ins.time}</span>
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200 flex gap-2 lg:gap-3 items-center rounded-b-[2.5rem]">
        <label className="p-3 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition-colors cursor-pointer shrink-0" title="Ambil Foto">
          <Camera size={20} />
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChatImageUpload} disabled={loading} />
        </label>
        <label className="p-3 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition-colors cursor-pointer shrink-0 hidden lg:block" title="Pilih dari Galeri">
          <ImagePlus size={20} />
          <input type="file" accept="image/*" className="hidden" onChange={handleChatImageUpload} disabled={loading} />
        </label>
        <button onClick={() => startDictation('chat')} type="button" className="px-3 py-2 bg-slate-50 text-slate-400 hover:text-blue-600 text-[10px] font-black uppercase rounded-xl transition-colors shrink-0 flex flex-col items-center justify-center" title="Dikte Suara">
          Dikte
        </button>
        <button onClick={toggleRecording} type="button" className={`p-3 rounded-xl transition-colors shrink-0 ${isRecording ? 'bg-red-100 text-red-600 animate-pulse border border-red-200' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`} title="Pesan Suara">
          <Mic size={20} />
        </button>
        <input 
          value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isRecording} 
          placeholder={isRecording ? "Merekam pesan suara..." : "Ketik arahan..."} 
          className="flex-1 bg-slate-100 rounded-xl px-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all min-w-0" 
          onKeyDown={(e) => { if (e.key === 'Enter' && chatInput.trim() && !isRecording) { postInstruction(chatInput, 'CHAT'); setChatInput(''); } }} 
        />
        <button onClick={() => { if (chatInput.trim() && !isRecording) { postInstruction(chatInput, 'CHAT'); setChatInput(''); } }} disabled={isRecording || loading} className="bg-blue-600 text-white p-3.5 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all shrink-0 disabled:opacity-50">
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  const renderOdometerPanel = () => (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
      <h4 className="text-sm font-black uppercase text-blue-900 border-b border-slate-100 pb-4 flex items-center gap-2">
        <Camera size={20} className="text-blue-500" /> FOTO ODOMETER (KM)
      </h4>
      {selectedTrip?.driverId === username && selectedTrip?.status === 'OTW' ? (
        <div className="grid grid-cols-1 gap-4">
          <div className="relative border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center hover:bg-slate-50 transition-colors">
            {selectedTrip.kmStartPhoto ? (
              <div className="relative">
                <img src={selectedTrip.kmStartPhoto} className="w-full h-32 object-cover rounded-2xl mb-4 re-invert" />
                <button onClick={() => removeOdometerPhoto('kmStartPhoto')} disabled={loading} className="absolute top-2 right-2 p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-colors z-10" title="Hapus Foto">
                   <Trash2 size={16} />
                </button>
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 mx-auto w-max">
                  <CheckCircle2 size={14}/> Tersimpan
                </div>
              </div>
            ) : (
              <>
                <div className="h-32 flex items-center justify-center text-slate-300 mb-4 bg-slate-50 rounded-2xl"><Camera size={40} /></div>
                <label className="bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase cursor-pointer w-max mx-auto block hover:bg-blue-200 transition-colors">
                  Foto KM Awal <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, 'kmStartPhoto')} />
                </label>
              </>
            )}
            <input type="number" placeholder="Angka KM Awal" defaultValue={selectedTrip.kmStartValue || ''} onBlur={(e) => handleKMValueChange('kmStartValue', e.target.value)} className="w-full mt-4 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div className="relative border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center hover:bg-slate-50 transition-colors">
            {selectedTrip.kmEndPhoto ? (
              <div className="relative">
                <img src={selectedTrip.kmEndPhoto} className="w-full h-32 object-cover rounded-2xl mb-4 re-invert" />
                <button onClick={() => removeOdometerPhoto('kmEndPhoto')} disabled={loading} className="absolute top-2 right-2 p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-colors z-10" title="Hapus Foto">
                   <Trash2 size={16} />
                </button>
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 mx-auto w-max">
                  <CheckCircle2 size={14}/> Tersimpan
                </div>
              </div>
            ) : (
              <>
                <div className="h-32 flex items-center justify-center text-slate-300 mb-4 bg-slate-50 rounded-2xl"><Camera size={40} /></div>
                <label className="bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase cursor-pointer w-max mx-auto block hover:bg-emerald-200 transition-colors">
                  Foto KM Akhir <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e, 'kmEndPhoto')} />
                </label>
              </>
            )}
            <input type="number" placeholder="Angka KM Akhir" defaultValue={selectedTrip.kmEndValue || ''} onBlur={(e) => handleKMValueChange('kmEndValue', e.target.value)} className="w-full mt-4 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center outline-none focus:border-blue-500 transition-colors" />
          </div>
        </div>
      ) : selectedTrip?.driverId === username && selectedTrip?.status === 'COMPLETED' ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-3xl p-6 text-center bg-slate-50">
            {selectedTrip.kmStartPhoto && <img src={selectedTrip.kmStartPhoto} className="w-full h-32 object-cover rounded-2xl mb-4 re-invert" />}
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Sebelum Jalan</p>
            <div className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-700">{selectedTrip.kmStartValue || '-'}</div>
          </div>
          <div className="border border-slate-200 rounded-3xl p-6 text-center bg-slate-50">
            {selectedTrip.kmEndPhoto && <img src={selectedTrip.kmEndPhoto} className="w-full h-32 object-cover rounded-2xl mb-4 re-invert" />}
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Tiba Kembali</p>
            <div className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-700">{selectedTrip.kmEndValue || '-'}</div>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-slate-50 rounded-3xl border border-slate-200">
          <AlertTriangle size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-sm font-black uppercase text-slate-500">Akses Terkunci</p>
        </div>
      )}
    </div>
  );

  const renderEConsentPanel = () => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex justify-between items-center h-max">
      <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-3">
        <Fingerprint size={24} className="text-blue-500" /> E-Consent
      </h4>
      {selectedTrip?.eConsent ? (
        <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> Disetujui Keluarga
        </div>
      ) : (
        <div className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-xs font-bold">Persetujuan Manual</div>
      )}
    </div>
  );

  const renderFinishButton = () => {
    if (role === 'driver' && selectedTrip?.driverId === username && selectedTrip?.status === 'OTW') {
      return (
        <button onClick={() => { if (!selectedTrip.kmStartPhoto || !selectedTrip.kmEndPhoto || !selectedTrip.kmStartValue || !selectedTrip.kmEndValue) { showToast('error', 'Lengkapi FOTO & ANGKA KM Odometer dahulu.'); return; } finishTrip(selectedTrip.id); }} 
          className={`w-full text-white font-black py-6 rounded-[2rem] shadow-2xl flex flex-col items-center gap-2 active:scale-95 transition-all h-max ${selectedTrip.serviceType === 'jenazah' ? 'bg-slate-800' : 'bg-blue-600'} ${(!selectedTrip.kmStartPhoto || !selectedTrip.kmEndPhoto || !selectedTrip.kmStartValue || !selectedTrip.kmEndValue) ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-1'}`}
        >
          <div className="flex items-center gap-3 text-lg"><CheckCircle2 size={24} /> SELESAIKAN MISI</div>
        </button>
      )
    }
    return null;
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!user || !selectedTrip || files.length === 0) return;

    const categorySelect = document.getElementById('docCategory');
    const category = categorySelect ? categorySelect.value : 'Berkas Lainnya';

    setLoading(true); showToast('success', 'Memproses berkas rujukan...');

    try {
      const newDocs = [];
      for (let file of files) {
        let base64Data = "";
        
        if (file.type.startsWith('image/')) {
          base64Data = await compressImage(file);
        } else if (file.type === 'application/pdf') {
          if (file.size > 1048576) {
            showToast('error', `Ukuran PDF ${file.name} melebihi batas 1MB.`);
            continue;
          }
          base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
          });
        } else {
           showToast('error', `Format ${file.name} tidak didukung. Harap upload PDF atau Foto.`);
           continue;
        }

        newDocs.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: file.type,
          category: category,
          url: base64Data
        });
      }

      if (newDocs.length > 0) {
        const currentDocs = selectedTrip.referralDocs || [];
        
        if (selectedTrip.referralDoc && currentDocs.length === 0) {
            currentDocs.push({
                id: 'old-doc',
                name: selectedTrip.referralDocName || 'Dokumen Rujukan',
                type: selectedTrip.referralDocType || 'application/pdf',
                category: 'Berkas Lama',
                url: selectedTrip.referralDoc
            });
        }

        const updatedDocs = [...currentDocs, ...newDocs];

        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', selectedTrip.id), {
          referralDocs: updatedDocs,
          referralDoc: null, 
          referralDocName: null,
          referralDocType: null
        });

        setSelectedTrip(prev => ({ ...prev, referralDocs: updatedDocs, referralDoc: null }));
        showToast('success', `${newDocs.length} Berkas berhasil diunggah!`);
      }
    } catch (err) {
      showToast('error', 'Gagal mengunggah berkas.');
    } finally {
      setLoading(false); e.target.value = '';
    }
  };

  const removeDocument = async (docId) => {
      if (!user || !selectedTrip) return;
      setLoading(true);
      try {
          if (docId === 'old-doc') {
             await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', selectedTrip.id), {
                referralDoc: null, referralDocName: null, referralDocType: null
             });
             setSelectedTrip(prev => ({ ...prev, referralDoc: null, referralDocName: null, referralDocType: null }));
          } else {
             const currentDocs = selectedTrip.referralDocs || [];
             const updatedDocs = currentDocs.filter(d => d.id !== docId);

             await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', selectedTrip.id), {
               referralDocs: updatedDocs
             });
             setSelectedTrip(prev => ({ ...prev, referralDocs: updatedDocs }));
          }
          showToast('success', 'Berkas berhasil dihapus.');
      } catch(e) { showToast('error', 'Gagal menghapus berkas.'); } finally { setLoading(false); }
  };

  const downloadFile = async (base64Data, fileName) => {
    try {
      showToast('success', 'Mempersiapkan unduhan berkas...');
      let blob;
      if (base64Data.startsWith('data:')) {
        const arr = base64Data.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) throw new Error("Format base64 tidak valid");
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        const response = await fetch(base64Data);
        blob = await response.blob();
      }
      
      await triggerDownload(blob, fileName || 'unduhan_berkas');
    } catch (error) {
      showToast('error', 'Gagal mengunduh berkas.');
    }
  };

  const uploadHistoryDocument = async (e, trip) => {
    const files = Array.from(e.target.files);
    if (!user || files.length === 0) return;

    setLoading(true); showToast('success', 'Memproses Surat Balik...');

    try {
      const newDocs = [];
      for (let file of files) {
        let base64Data = "";
        
        if (file.type.startsWith('image/')) {
          if (file.size > 10485760) {
            showToast('error', `Ukuran Foto ${file.name} terlalu besar. (Maks 10MB)`);
            continue;
          }
          base64Data = await compressImage(file);
        } else if (file.type === 'application/pdf') {
          if (file.size > 1048576) {
            showToast('error', `Ukuran PDF ${file.name} melebihi batas 1MB.`);
            continue;
          }
          base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
          });
        } else {
           showToast('error', `Format ${file.name} tidak didukung.`);
           continue;
        }

        newDocs.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: file.type,
          category: 'Surat Balik RS Tujuan', 
          url: base64Data
        });
      }

      if (newDocs.length > 0) {
        const currentDocs = trip.referralDocs || [];
        
        if (trip.referralDoc && currentDocs.length === 0) {
            currentDocs.push({
                id: 'old-doc',
                name: trip.referralDocName || 'Dokumen Rujukan',
                type: trip.referralDocType || 'application/pdf',
                category: 'Berkas Lama',
                url: trip.referralDoc
            });
        }

        const updatedDocs = [...currentDocs, ...newDocs];

        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'trips', trip.id), {
          referralDocs: updatedDocs,
          referralDoc: null,
          referralDocName: null,
          referralDocType: null
        });

        showToast('success', `${newDocs.length} Surat Balik berhasil diunggah!`);
      }
    } catch (err) {
      showToast('error', 'Gagal mengunggah Surat Balik.');
    } finally {
      setLoading(false); e.target.value = '';
    }
  };

  const renderDocumentUploadPanel = () => {
    const docs = selectedTrip?.referralDocs || [];
    
    if (docs.length === 0 && selectedTrip?.referralDoc) {
       docs.push({
         id: 'old-doc',
         name: selectedTrip.referralDocName || 'Dokumen Rujukan',
         type: selectedTrip.referralDocType || 'application/pdf',
         category: 'Berkas Lama',
         url: selectedTrip.referralDoc
       });
    }

    return (
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 h-max">
        <h4 className="text-sm font-black uppercase text-blue-900 tracking-widest flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <span className="flex items-center gap-2"><UploadCloud size={20} className="text-blue-600" /> Berkas Rujukan</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{docs.length} File</span>
        </h4>

        {docs.length > 0 ? (
          <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
            {docs.map((docItem) => (
              <div key={docItem.id} className="flex items-center justify-between bg-blue-50 p-3 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-white p-2 rounded-xl text-blue-600 shadow-sm shrink-0">
                    {docItem.type.startsWith('image/') ? <ImagePlus size={20} /> : <FileText size={20} />}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate" title={docItem.name}>{docItem.name}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5">
                      <span className="text-blue-600">{docItem.category}</span> • {docItem.type === 'application/pdf' ? 'PDF' : 'FOTO'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <button onClick={() => downloadFile(docItem.url, docItem.name)} className="p-2 bg-white text-blue-600 hover:bg-blue-100 rounded-lg shadow-sm transition-colors" title="Unduh Berkas">
                    <Download size={14} />
                  </button>
                  {role === 'nurse' && (
                    <button onClick={() => removeDocument(docItem.id)} className="p-2 bg-white text-red-500 hover:bg-red-50 rounded-lg shadow-sm transition-colors" title="Hapus Berkas" disabled={loading}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          role !== 'nurse' && (
            <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100 opacity-60">
               <p className="text-xs font-bold text-slate-500">Belum ada berkas rujukan yang diunggah perawat.</p>
            </div>
          )
        )}

        {role === 'nurse' && (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center hover:bg-slate-50 transition-colors relative mt-2">
            <div className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <UploadCloud size={20} />
            </div>
            <p className="text-xs font-bold text-slate-600 mb-2">Tambah Berkas</p>

            <select id="docCategory" className="w-full max-w-[220px] mx-auto mb-3 text-[10px] p-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-slate-700 font-bold block bg-white cursor-pointer shadow-sm text-center">
              <option value="Surat Pengantar Rujukan">📄 Surat Pengantar Rujukan</option>
              <option value="Surat SISRUTE">🌐 Surat SISRUTE</option>
              <option value="Berkas Lainnya">📎 Berkas Lainnya</option>
            </select>

            <label className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-colors inline-block w-full max-w-[220px]">
              Pilih Berkas
              <input type="file" multiple accept=".pdf,image/png,image/jpeg,image/jpg" className="hidden" onChange={handleDocumentUpload} disabled={loading} />
            </label>
            <p className="text-[9px] text-slate-400 mt-2">Bisa pilih &gt; 1 file (Maks 1 MB / file)</p>
          </div>
        )}
      </div>
    );
  };

  const renderTTVPanel = () => (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
      <h4 className="text-sm font-black uppercase text-blue-900 tracking-widest flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
        <Activity size={20} className="text-blue-600" /> Form Update TTV
      </h4>
      <form onSubmit={handleUpdateTTV} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Heart Rate</label>
            <input name="hr" type="number" defaultValue={selectedTrip?.vitals?.hr} className="w-full bg-transparent font-black text-blue-950 outline-none mt-1 text-lg" required />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500 uppercase">SpO2 (%)</label>
            <input name="spo2" type="number" defaultValue={selectedTrip?.vitals?.spo2} className="w-full bg-transparent font-black text-blue-950 outline-none mt-1 text-lg" required />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Tensi</label>
            <input name="bp" type="text" defaultValue={selectedTrip?.vitals?.bp} className="w-full bg-transparent font-black text-blue-950 outline-none mt-1 text-lg" required />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Suhu (°C)</label>
            <input name="temp" type="number" step="0.1" defaultValue={selectedTrip?.vitals?.temp} className="w-full bg-transparent font-black text-blue-950 outline-none mt-1 text-lg" required />
          </div>
        </div>
        <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 text-sm transition-all">SIMPAN & LAPORKAN TTV</button>
      </form>
      
      {selectedTrip?.vitals && (
        <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500">Skor Early Warning (EWS)</p>
            <p className={`font-black text-lg ${calculateEWS(selectedTrip.vitals).text}`}>{calculateEWS(selectedTrip.vitals).score} - {calculateEWS(selectedTrip.vitals).status}</p>
          </div>
          <Heart className={calculateEWS(selectedTrip.vitals).text} size={24} />
        </div>
      )}
    </div>
  );

  if (view === 'login') {
    const inputStyle = "w-full bg-white text-slate-800 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.1)] outline-none transition-all text-sm font-bold";

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 font-sans relative overflow-hidden p-4">
        {!isOnline && (
          <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black py-1.5 text-center z-[9999] flex justify-center items-center gap-2">
            <WifiOff size={14} /> KONEKSI TERPUTUS - MODE OFFLINE AKTIF (DATA DISIMPAN LOKAL)
          </div>
        )}
        <MessageToast />
        
        {darkMode && (
          <style>{`
            html { filter: invert(1) hue-rotate(180deg); background: #111; }
            img, video, iframe, .leaflet-container, .re-invert { filter: invert(1) hue-rotate(180deg); }
            img.dark-logo-fix { filter: none !important; }
          `}</style>
        )}
        
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-600/10 to-transparent blur-3xl"></div>
          <div className="absolute top-[20%] -left-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-red-600/5 to-transparent blur-3xl"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-t from-blue-100/40 to-transparent blur-3xl"></div>
        </div>

        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white relative z-10 flex flex-col">
          <div className="flex flex-col items-center mb-6 mt-2 w-full">
            <img src={LOGO_URL} onError={handleLogoError} alt="Logo" className={`w-[90%] max-w-[350px] h-auto object-contain mb-4 transition-all mix-blend-multiply ${darkMode ? 'dark-logo-fix' : 're-invert'}`} />
          </div>

          <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Akses Username</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="username" placeholder="ID Petugas / Username" required className={`${inputStyle} pl-11 pr-5`} />
              </div>
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Kata Sandi</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required className={`${inputStyle} pl-11 pr-12`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center px-1 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                <span className="text-xs font-medium text-slate-500 select-none">Ingat Saya</span>
              </label>
              <button type="button" onClick={() => showToast('error', 'Silakan hubungi Tim IT/Admin untuk reset.', 1500)} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-all">Lupa Password?</button>
            </div>
            
            <button type="submit" className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-red-600 hover:from-blue-800 hover:to-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-6 flex justify-center items-center gap-3 text-sm tracking-widest">
              <Rocket size={18} /> MASUK SISTEM
            </button>
          </form>
        </div>

        <div className="mt-8 relative z-10 flex items-center justify-center gap-2 text-slate-500 opacity-80">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">RSUD Kabupaten Lebong - Secured</span>
        </div>
      </div>
    );
  }

  const isHomeActive = (view === 'home' || view === 'management' || view === 'superadmin') && !selectedTrip && view !== 'history';
  const isHistoryActive = view === 'history';

  const currentUserData = appUsers[username] || DEFAULT_USERS[username];
  const userDisplayName = currentUserData ? currentUserData.name : username;

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {darkMode && (
        <style>{`
          html { filter: invert(1) hue-rotate(180deg); background: #111; }
          img, video, iframe, .leaflet-container, .re-invert { filter: invert(1) hue-rotate(180deg); }
          img.dark-logo-fix { filter: none !important; }
        `}</style>
      )}

      {!isOnline && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black py-1.5 text-center z-[9999] flex justify-center items-center gap-2">
          <WifiOff size={14} /> KONEKSI TERPUTUS - MODE OFFLINE AKTIF (DATA DISIMPAN LOKAL)
        </div>
      )}

      <MessageToast />
      
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={36} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Keluar Aplikasi?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">Anda yakin ingin mengakhiri sesi ini? Sesi Anda akan ditutup sepenuhnya.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all">Batal</button>
              <button onClick={performLogout} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-200 transition-all">Ya, Keluar</button>
            </div>
          </div>
        </div>
      )}

      {tripToDelete && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={36} className="text-red-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Hapus Riwayat?</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">
                  Tindakan ini hanya dapat dilakukan oleh Superadmin dan tidak dapat dibatalkan. Riwayat <strong>{tripToDelete.patientName}</strong> akan dihapus permanen dari sistem.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setTripToDelete(null)} disabled={loading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all">Batal</button>
                    <button onClick={confirmDeleteHistory} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-200 transition-all flex justify-center items-center">
                        {loading ? 'Menghapus...' : 'Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={36} className="text-red-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Hapus Akun?</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">
                  Anda yakin ingin menghapus akun <strong>@{userToDelete}</strong>? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setUserToDelete(null)} disabled={loading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all">Batal</button>
                    <button onClick={confirmDeleteUser} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-200 transition-all flex justify-center items-center">
                        {loading ? 'Menghapus...' : 'Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {activeTripToCancel && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={36} className="text-red-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Batalkan Rujukan?</h3>
                <p className="text-sm text-slate-500 font-medium mb-8">
                  Anda yakin ingin membatalkan dan menghapus rujukan <strong>{activeTripToCancel.patientName}</strong>? Tindakan ini tidak dapat dikembalikan.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setActiveTripToCancel(null)} disabled={loading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all">Kembali</button>
                    <button onClick={confirmCancelActiveTrip} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-200 transition-all flex justify-center items-center">
                        {loading ? 'Memproses...' : 'Ya, Batalkan'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {fullScreenMapId && activeTrips.find(t => t.id === fullScreenMapId) && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-10">
            <div>
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-emerald-400">
                <MapPin size={18} /> GPS LIVE TRACKING
              </h3>
              <p className="text-xs font-bold mt-1 text-slate-300">
                {maskSensitiveData(activeTrips.find(t => t.id === fullScreenMapId)?.patientName, role, 'OTW')} - Driver: {activeTrips.find(t => t.id === fullScreenMapId)?.driver}
              </p>
            </div>
            <button onClick={() => setFullScreenMapId(null)} className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors text-white">
              <Minimize size={24} />
            </button>
          </div>
          <div className="flex-1 w-full relative z-0">
            <NativeMapRender 
              initialLat={-3.1950} 
              initialLng={102.1648} 
              mapId={`map-fs-${fullScreenMapId}`} 
              trackingId={fullScreenMapId}
            />
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center animate-pulse border-4 ${incomingCall.serviceType === 'jenazah' ? 'bg-slate-800 border-slate-600 shadow-slate-800/50' : 'bg-red-600 border-red-400 shadow-red-600/50'}`}>
            <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              {incomingCall.serviceType === 'jenazah' ? <ShieldCheck size={56} className="text-slate-200 animate-bounce" /> : <Siren size={56} className="text-white animate-bounce" />}
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter drop-shadow-md">
              {incomingCall.serviceType === 'jenazah' ? 'MOBIL JENAZAH!' : 'PANGGILAN DARURAT!'}
            </h2>
            <p className="text-white/80 font-bold mb-4 text-sm">
              {incomingCall.serviceType === 'jenazah' ? 'Permintaan evakuasi jenazah:' : 'Terdapat permintaan rujukan baru:'}<br />
              <span className="text-2xl text-white font-black block mt-2 bg-black/20 py-2 rounded-xl">
                {maskSensitiveData(incomingCall.patientName, role, incomingCall.status)}
              </span>
            </p>
            <div className="bg-black/30 p-3 rounded-2xl mb-6 inline-block w-full border border-white/10">
              <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold mb-1">Rute</p>
              <p className="text-sm font-black text-white leading-tight">{incomingCall.origin} <br /><span className="text-white/50">↓</span><br /> {incomingCall.destination}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleRejectCall(incomingCall.id)} disabled={loading} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-black py-4 rounded-2xl shadow-sm active:scale-95 text-sm border border-slate-600">TOLAK</button>
              <button onClick={() => acceptCall(incomingCall)} disabled={loading} className={`flex-[2] text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 text-sm flex items-center justify-center gap-2 ${incomingCall.serviceType === 'jenazah' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-white !text-red-700 hover:bg-slate-100'}`}>
                {loading ? 'MEMPROSES...' : <><CheckCircle2 size={20} /> TERIMA TUGAS</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {(role === 'doctor' || role === 'management') && activeTrips.some(t => t.status === 'OTW' && t.serviceType !== 'jenazah' && t.vitals?.spo2 < 90) && (
        <div className="absolute top-20 lg:top-4 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-[500px] z-[110] animate-bounce">
          <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-3">
            <AlertTriangle className="animate-ping" />
            <div>
              <p className="text-[10px] font-black uppercase leading-none mb-1">Peringatan Kritis!</p>
              <p className="text-xs font-bold">Pasien {activeTrips.find(t => t.status === 'OTW' && t.vitals?.spo2 < 90)?.patientName} Butuh Tindakan Segera!</p>
            </div>
          </div>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-[280px] bg-white text-slate-600 transition-all shadow-[4px_0_24px_rgba(0,0,0,0.03)] z-40 flex-shrink-0 relative border-r border-slate-200">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center justify-center bg-white sticky top-0 z-10 text-center">
          <img src={LOGO_URL} onError={handleLogoError} className={`w-full px-2 max-w-[260px] h-auto object-contain mb-2 mix-blend-multiply ${darkMode ? 'dark-logo-fix' : 're-invert'}`} alt="Logo" />
          <div>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest bg-blue-50 px-3 py-1 rounded inline-block mt-1">
              {role === 'management' ? 'Manajemen' : role === 'doctor' ? 'Dokter' : role === 'nurse' ? 'Perawat' : role}
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 mt-2 hide-scrollbar">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-3 mt-2">Menu Utama</p>
          
          <button 
            onClick={() => setView(role === 'management' ? 'management' : (role === 'superadmin' ? 'superadmin' : 'home'))} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border border-transparent ${isHomeActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
          >
            <LayoutDashboard size={20} /> <span className="tracking-wide">Dasbor Sistem</span>
          </button>
          
          <button 
            onClick={() => { setView('history'); setSelectedTrip(null); }} 
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all border border-transparent ${isHistoryActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
          >
            <History size={20} /> <span className="tracking-wide">Riwayat Layanan</span>
          </button>

          {selectedTrip && view === 'tripDetail' && (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-3 mt-6">Monitoring Aktif</p>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 relative overflow-hidden group hover:bg-emerald-100 transition-colors">
                <Navigation size={20} className="text-emerald-500 animate-pulse" /> <span className="tracking-wide truncate">Live: {maskSensitiveData(selectedTrip.patientName, role, selectedTrip.status)}</span>
                <div className="absolute right-4 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              </button>
            </>
          )}

          {(dailyCheck || nurseCheck) && !selectedTrip && view !== 'tripDetail' && role !== 'management' && role !== 'superadmin' && (
            <div className="mt-auto mb-4 shrink-0 bg-emerald-50 border border-emerald-100 p-5 rounded-[2rem] text-center shadow-sm relative overflow-hidden">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Piket Anda Aktif</p>
              <p className="text-xs text-emerald-600 mt-1 font-semibold">Siap menerima tugas.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 mt-auto">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-inner">
                {userDisplayName?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left overflow-hidden hidden xl:block">
                <p className="text-xs font-bold text-slate-800 truncate">{userDisplayName}</p>
                <p className="text-[9px] text-emerald-600 uppercase font-bold tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setDarkMode(!darkMode)} title="Mode Gelap / Terang" className="p-2.5 text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-all">
                {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
              </button>
              <button onClick={handleLogout} title="Keluar Akun" className="p-2.5 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition-all">
                <LogOut size={18}/>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50/50">
        <header className="lg:hidden bg-white/90 backdrop-blur-md sticky top-0 z-50 p-3 sm:p-4 border-b border-slate-200 flex justify-between items-center shadow-sm gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <img src={LOGO_URL} onError={handleLogoError} alt="SI-ELANG" className={`w-[130px] sm:w-[180px] h-auto max-h-[45px] sm:max-h-[60px] object-contain shrink-0 mix-blend-multiply ${darkMode ? 'dark-logo-fix' : 're-invert'}`} />
            <div className="flex flex-col justify-center overflow-hidden">
              <p className="font-bold text-xs text-slate-800 truncate leading-none mb-0.5">{userDisplayName}</p>
              <p className="font-bold text-[9px] sm:text-[10px] uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-1 rounded w-max border border-blue-100 truncate">
                {role === 'management' ? 'Manajemen' : role === 'doctor' ? 'Dokter' : role === 'nurse' ? 'Perawat' : role}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <button onClick={() => setDarkMode(!darkMode)} className="bg-slate-100 p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all shrink-0">
              {darkMode ? <Sun size={18} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="bg-red-50 p-2 sm:p-2.5 rounded-xl text-red-600 hover:text-white hover:bg-red-600 transition-all shrink-0">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-32 lg:pb-10 hide-scrollbar">
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div className="mx-auto max-w-7xl space-y-6">

            {role === 'driver' && !dailyCheck && view === 'home' && (
              <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 max-w-3xl mx-auto animate-in fade-in space-y-6">
                <div className="text-center lg:text-left border-b border-slate-100 pb-4">
                  <h2 className="text-xl lg:text-2xl font-black flex justify-center lg:justify-start items-center gap-2 text-blue-900">
                    <Wrench className="text-orange-500" /> INSPEKSI ARMADA
                  </h2>
                </div>
                <form onSubmit={handleDailyCheck} className="space-y-6">
                  <input name="driverName" placeholder="Nama Lengkap Driver" className="w-full p-4 bg-slate-50 border border-slate-200 font-bold text-sm focus:border-blue-500 outline-none rounded-2xl" required />
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-blue-900 tracking-widest flex items-center gap-2 border-b pb-2">
                      <Truck size={14} /> Kendaraan & Keselamatan
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 lg:p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">BBM</label>
                        <select name="fuel" className="w-full bg-transparent font-black text-blue-900 outline-none text-sm mt-1">
                          <option value="Full">Full</option>
                          <option value="3/4">3/4</option>
                          <option value="1/2">1/2</option>
                          <option value="Kurang">Kurang</option>
                        </select>
                      </div>
                      <div className="bg-slate-50 p-3 lg:p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Lampu & Sirine</label>
                        <select name="lampuSirine" className="w-full bg-transparent font-black text-blue-900 outline-none text-sm mt-1">
                          <option value="Berfungsi Baik">Berfungsi Baik</option>
                          <option value="Ada Kendala">Ada Kendala</option>
                        </select>
                      </div>
                      <div className="bg-slate-50 p-3 lg:p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Ban & Rem</label>
                        <select name="banRem" className="w-full bg-transparent font-black text-blue-900 outline-none text-sm mt-1">
                          <option value="Berfungsi Baik">Aman & Laik</option>
                          <option value="Ada Kendala">Cek Berkala</option>
                        </select>
                      </div>
                      <div className="bg-slate-50 p-3 lg:p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Aki & Mesin</label>
                        <select name="akiMesin" className="w-full bg-transparent font-black text-blue-900 outline-none text-sm mt-1">
                          <option value="Berfungsi Baik">Normal</option>
                          <option value="Ada Kendala">Terdapat Error</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-blue-900 tracking-widest flex items-center gap-2 border-b pb-2">
                      <Sparkles size={14} /> Fasilitas Umum
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 lg:p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Oksigen (PSI)</label>
                        <input name="oxygen" type="number" defaultValue="2000" className="w-full bg-transparent font-black text-blue-600 outline-none text-sm mt-1" required />
                      </div>
                      <div className="bg-slate-50 p-3 lg:p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tabung APAR</label>
                        <select name="apar" className="w-full bg-transparent font-black text-blue-900 outline-none text-sm mt-1">
                          <option value="Tersedia & Valid">Tersedia & Valid</option>
                          <option value="Kosong/Expired">Kosong / Expired</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 lg:py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all">
                    {loading ? 'MEMPROSES...' : <><CheckCircle2 size={20} /> VALIDASI KELAYAKAN ARMADA</>}
                  </button>
                </form>
              </div>
            )}

            {role === 'nurse' && !nurseCheck && view === 'home' && (
              <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-emerald-100 max-w-3xl mx-auto animate-in fade-in space-y-6">
                <div className="text-center lg:text-left border-b border-emerald-50 pb-4">
                  <h2 className="text-xl lg:text-2xl font-black flex justify-center lg:justify-start items-center gap-2 text-emerald-700">
                    <BriefcaseMedical className="text-emerald-500" /> INSPEKSI MEDIS & APD
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Wajib diisi</p>
                </div>
                <form onSubmit={handleNurseCheck} className="space-y-6">
                  <input name="nurseName" placeholder="Nama Lengkap Perawat Shift Ini" className="w-full p-4 bg-emerald-50 border border-emerald-100 font-bold text-sm focus:border-emerald-500 outline-none rounded-2xl" required />
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-emerald-800 tracking-widest flex items-center gap-2 border-b border-emerald-50 pb-2">
                      <Pill size={14} /> Obat Emergency
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Obat Resusitasi</label>
                        <select name="obatEmergency" className="w-full bg-transparent font-black text-emerald-800 outline-none text-sm mt-1">
                          <option value="Lengkap">Lengkap (Epinefrin, dll)</option>
                          <option value="Tidak Lengkap">Tidak Lengkap (Lapor Farmasi)</option>
                        </select>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cairan Infus</label>
                        <select name="cairanInfus" className="w-full bg-transparent font-black text-emerald-800 outline-none text-sm mt-1">
                          <option value="Tersedia (RL, NaCl)">Tersedia Cukup</option>
                          <option value="Kurang">Kurang (Isi Ulang)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-emerald-800 tracking-widest flex items-center gap-2 border-b border-emerald-50 pb-2">
                      <Stethoscope size={14} /> Alat Pelindung Diri
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Handscoon & Gaun</label>
                        <select name="handscoon" className="w-full bg-transparent font-black text-emerald-800 outline-none text-sm mt-1">
                          <option value="Tersedia">Tersedia Lengkap</option>
                          <option value="Habis">Stok Habis</option>
                        </select>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Masker N95 / Bedah</label>
                        <select name="masker" className="w-full bg-transparent font-black text-emerald-800 outline-none text-sm mt-1">
                          <option value="Tersedia">Tersedia Lengkap</option>
                          <option value="Habis">Stok Habis</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 lg:py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all">
                    {loading ? 'MEMPROSES...' : <><ShieldCheck size={20} /> VALIDASI KESIAPAN MEDIS</>}
                  </button>
                </form>
              </div>
            )}

            {view === 'home' && (
              <div className="space-y-6">
                {role === 'driver' && dailyCheck && (
                  <div className="bg-blue-900 text-white p-6 lg:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden animate-in fade-in">
                    <div className="absolute right-[-20px] top-[-20px] opacity-[0.05] -rotate-12">
                      <Truck size={200} />
                    </div>
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div>
                        <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">Status Hari Ini</p>
                        <h3 className="text-3xl lg:text-4xl font-black">ARMADA SIAP</h3>
                        <p className="text-xs font-bold text-blue-200 mt-1 uppercase bg-white/10 w-max px-3 py-1 rounded-lg">Driver: {dailyCheck.driverName}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 flex-1 lg:max-w-md">
                        <div className="bg-white/10 p-3 lg:p-4 rounded-2xl backdrop-blur-sm">
                          <Siren size={18} className="text-orange-400 mb-2" />
                          <p className="text-[9px] font-bold uppercase text-blue-200">Lampu/Sirine</p>
                          <p className="text-xs font-black truncate">{dailyCheck.kendaraan?.lampuSirine}</p>
                        </div>
                        <div className="bg-white/10 p-3 lg:p-4 rounded-2xl backdrop-blur-sm">
                          <Wind size={18} className="text-cyan-400 mb-2" />
                          <p className="text-[9px] font-bold uppercase text-blue-200">Oksigen</p>
                          <p className="text-xs font-black truncate">{dailyCheck.medis?.oxygen} PSI</p>
                        </div>
                        <div className="bg-white/10 p-3 lg:p-4 rounded-2xl backdrop-blur-sm">
                          <Sparkles size={18} className="text-emerald-400 mb-2" />
                          <p className="text-[9px] font-bold uppercase text-blue-200">Kebersihan</p>
                          <p className="text-xs font-black truncate">{dailyCheck.medis?.kebersihan?.split('/')[0] || 'Bersih'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(role === 'nurse' || role === 'doctor') && ((role === 'nurse' && nurseCheck) || role === 'doctor') && (
                  <div className="animate-in fade-in">
                    <button onClick={() => { setDefaultTriage(''); setView('createTrip'); }} className="w-full bg-blue-600 text-white p-6 lg:p-8 rounded-[2rem] shadow-xl hover:bg-blue-700 hover:shadow-2xl flex items-center justify-between group transition-all">
                      <div className="text-left flex items-center gap-5">
                        <div className="bg-white/20 p-4 lg:p-5 rounded-full group-hover:scale-110 transition-transform">
                          <Plus size={36} />
                        </div>
                        <div>
                          <h2 className="text-xl lg:text-2xl font-black uppercase tracking-widest">Layanan Evakuasi Baru</h2>
                          <p className="text-sm text-blue-100 font-bold mt-1">Input Pasien Medis / Antar Jenazah Baru</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest px-1 flex justify-between items-center mb-4 mt-6">
                    Daftar Rujukan Aktif <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs">{visibleTrips.length}</span>
                  </h3>
                  
                  {visibleTrips.length === 0 && (
                    <div className="bg-white p-12 rounded-[2rem] text-center border border-slate-200 shadow-sm opacity-60">
                      <ShieldCheck size={56} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Tidak ada pasien dalam perjalanan</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visibleTrips.map(trip => {
                      const tColor = getTriageColor(trip.triage);
                      const safeName = maskSensitiveData(trip.patientName, role, trip.status);
                      return (
                        <div key={trip.id} onClick={() => { setSelectedTrip(trip); setView('tripDetail'); }} className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-8 border-y border-r flex flex-col justify-between group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all ${tColor.border} ${trip.status === 'PENDING' ? 'opacity-80 border-dashed' : ''}`}>
                          <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
                            <div className="flex gap-3 items-center">
                              <div className={`${tColor.bg} p-3 rounded-2xl ${tColor.text}`}>
                                {trip.serviceType === 'jenazah' ? <ShieldCheck size={24}/> : <Activity size={24}/>}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 tracking-tight text-lg leading-tight mb-1">{safeName}</h4>
                                <div className="flex gap-1.5 flex-wrap">
                                  {trip.serviceType === 'jenazah' ? (
                                    <span className="text-[9px] px-2 py-0.5 rounded-md font-black uppercase bg-slate-800 text-white">JENAZAH</span>
                                  ) : (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase ${tColor.bg} ${tColor.text}`}>{trip.triage}</span>
                                  )}
                                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase border ${trip.paymentStatus === 'BPJS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{trip.paymentStatus || 'UMUM'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-xl text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                              <Navigation size={20} />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 font-bold uppercase truncate mb-3 bg-slate-50 p-2 rounded-lg">{trip.origin} → {trip.destination}</p>
                            {trip.status === 'PENDING' ? (
                              <p className="text-[10px] font-black tracking-widest uppercase text-orange-500 animate-pulse bg-orange-50 p-2 rounded-lg text-center">Menunggu Driver...</p>
                            ) : (
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                                <span className="flex items-center gap-1.5"><Truck size={12} className="text-blue-500"/> {trip.driver}</span>
                                <span className="flex items-center gap-1.5"><Stethoscope size={12} className="text-emerald-500"/> {trip.nurse}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {view === 'createTrip' && (
              <form onSubmit={createNewTrip} className="bg-white p-6 lg:p-10 rounded-[2.5rem] shadow-xl border border-slate-200 max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom">
                <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-4">
                  <h2 className="font-black text-xl lg:text-2xl text-blue-900 flex items-center gap-2"><FileText className="text-blue-500"/> Form Layanan Ambulans</h2>
                  <button type="button" onClick={() => setView('home')} className="bg-slate-100 text-slate-500 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-100 hover:text-red-600 transition-colors">Batal</button>
                </div>

                <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl">
                  <button type="button" onClick={() => setServiceType('rujukan')} className={`flex-1 py-3.5 text-xs lg:text-sm font-black uppercase tracking-widest rounded-xl transition-all ${serviceType === 'rujukan' ? 'bg-white shadow-md text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}>🚑 Rujukan Medis</button>
                  <button type="button" onClick={() => setServiceType('jenazah')} className={`flex-1 py-3.5 text-xs lg:text-sm font-black uppercase tracking-widest rounded-xl transition-all ${serviceType === 'jenazah' ? 'bg-slate-800 shadow-md text-white' : 'text-slate-400 hover:text-slate-600'}`}>⚰️ Antar Jenazah</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-6">
                    {serviceType === 'rujukan' && (
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Status Kegawatdaruratan</label>
                        <div className="grid grid-cols-3 gap-2">
                          <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${defaultTriage === 'Merah' ? 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-100' : 'border-slate-100 text-slate-400'}`}>
                            <input type="radio" name="triage" value="Merah" className="hidden" defaultChecked={defaultTriage === 'Merah'} onChange={() => setDefaultTriage('Merah')} required />
                            <AlertTriangle size={20} className="mx-auto mb-1" />
                            <span className="text-[10px] lg:text-xs font-black uppercase block">Merah</span>
                          </label>
                          <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${defaultTriage === 'Kuning' ? 'border-yellow-500 bg-yellow-50 text-yellow-700 ring-4 ring-yellow-100' : 'border-slate-100 text-slate-400'}`}>
                            <input type="radio" name="triage" value="Kuning" className="hidden" defaultChecked={defaultTriage === 'Kuning'} onChange={() => setDefaultTriage('Kuning')} required />
                            <AlertCircle size={20} className="mx-auto mb-1" />
                            <span className="text-[10px] lg:text-xs font-black uppercase block">Kuning</span>
                          </label>
                          <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${defaultTriage === 'Hijau' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-100' : 'border-slate-100 text-slate-400'}`}>
                            <input type="radio" name="triage" value="Hijau" className="hidden" defaultChecked={defaultTriage === 'Hijau'} onChange={() => setDefaultTriage('Hijau')} required />
                            <CheckCircle2 size={20} className="mx-auto mb-1" />
                            <span className="text-[10px] lg:text-xs font-black uppercase block">Hijau</span>
                          </label>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Status Pembiayaan</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${paymentStatus === 'BPJS' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}>
                          <input type="radio" name="paymentStatus" value="BPJS" className="hidden" defaultChecked={paymentStatus === 'BPJS'} onChange={() => setPaymentStatus('BPJS')} required />
                          <span className="text-xs font-black uppercase block">BPJS</span>
                        </label>
                        <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${paymentStatus === 'UMUM' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}>
                          <input type="radio" name="paymentStatus" value="UMUM" className="hidden" defaultChecked={paymentStatus === 'UMUM'} onChange={() => setPaymentStatus('UMUM')} required />
                          <span className="text-xs font-black uppercase block">UMUM</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 lg:pl-6 lg:border-l lg:border-slate-100">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Data Identitas</label>
                    <input name="patientName" placeholder={`Nama Lengkap ${serviceType === 'jenazah' ? 'Almarhum/ah' : 'Pasien'}`} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none transition-colors" required />
                    <div className="grid grid-cols-2 gap-3">
                      <input name="age" type="number" placeholder="Usia (Thn)" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:border-blue-500 outline-none transition-colors" required />
                      <select name="gender" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 focus:border-blue-500 outline-none transition-colors cursor-pointer" required>
                        <option value="">Gender</option>
                        <option value="L">Laki-Laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    
                    <div className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Diagnosa Medis</label>
                        <button type="button" onClick={() => startDictation('input[name="diagnosis"]')} className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800"><Mic size={14}/> Dikte Suara</button>
                      </div>
                      <input name="diagnosis" placeholder={serviceType === 'jenazah' ? 'Sebab Kematian' : 'Diagnosa / Alasan Rujukan'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:border-blue-500 outline-none transition-colors" required />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Tim Medis</label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <input name="dpjp" placeholder={serviceType === 'jenazah' ? "Dokter Pemeriksa (Opsional)" : "Dokter DPJP"} className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm focus:border-blue-500 font-bold text-blue-900 outline-none transition-colors" required={serviceType === 'rujukan'} />
                    <input name="origin" placeholder={serviceType === 'jenazah' ? "Kamar Jenazah / IGD" : "Ruangan Asal"} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-blue-500 font-semibold outline-none transition-colors" required />
                  </div>
                  {serviceType === 'rujukan' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <select name="destination" onChange={(e) => setSelectedRS(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 transition-colors cursor-pointer" required>
                        <option value="">Pilih RS Tujuan...</option>
                        <option value="RSUD M Yunus Bengkulu">RSUD M Yunus Bengkulu</option>
                        <option value="RS Tiara Sella Bengkulu">RS Tiara Sella</option>
                        <option value="RSKJ Soeprapto Bengkulu">RSKJ Soeprapto</option>
                        <option value="RSUD Curup">RSUD Curup</option>
                        <option value="Lainnya">Lainnya...</option>
                      </select>
                      {selectedRS === 'Lainnya' && <input name="customDestination" placeholder="Ketik Nama RS Tujuan" className="w-full p-4 bg-orange-50 border border-orange-200 rounded-2xl text-sm font-bold text-orange-900 outline-none focus:border-orange-500 transition-colors" required />}
                    </div>
                  ) : (
                    <input name="jenazahDestination" placeholder="Alamat Rumah Duka / Pemakaman" className="w-full p-4 bg-slate-800 text-white border border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-slate-500 transition-colors" required />
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex items-start gap-4">
                  <input type="checkbox" name="eConsent" id="eConsent" className="mt-1 w-5 h-5 accent-blue-600 rounded cursor-pointer" required />
                  <label htmlFor="eConsent" className="text-xs text-blue-900 leading-relaxed cursor-pointer">
                    <strong className="block uppercase tracking-widest mb-1 font-black">E-Consent & Privasi Data</strong>
                    Keluarga menyetujui tindakan rujukan dan memahami bahwa sistem melindungi kerahasiaan data medis pasien.
                  </label>
                </div>
                <button disabled={loading} className={`w-full text-white font-black py-5 rounded-2xl text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${serviceType === 'jenazah' ? 'bg-slate-800 hover:bg-slate-900' : (defaultTriage === 'Merah' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700')}`}>
                  {loading ? 'MEMPROSES...' : <><Navigation size={24} /> {serviceType === 'jenazah' ? 'PANGGIL MOBIL JENAZAH' : 'AKTIFKAN RUJUKAN LIVE'}</>}
                </button>
              </form>
            )}

            {role === 'management' && view === 'management' && (
              <div className="space-y-8 animate-in fade-in">
                
                {allDriverChecks.filter(check => Number(check.medis?.oxygen) < 1000).length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 p-5 rounded-3xl flex items-start gap-4 shadow-sm">
                    <AlertTriangle className="text-orange-500 mt-0.5" size={28} />
                    <div>
                      <h4 className="font-black text-sm text-orange-800 uppercase tracking-widest mb-1">Inventory Alert Sistem</h4>
                      <div className="text-xs font-bold text-orange-700 space-y-1">
                        Sistem mendeteksi armada dengan stok Oksigen rendah (Di bawah 1000 PSI):
                        <ul className="list-disc ml-4 mt-1">
                          {allDriverChecks.filter(check => Number(check.medis?.oxygen) < 1000).map(check => (
                            <li key={check.id}>Ambulans Driver {check.driverName} (Sisa: {check.medis?.oxygen} PSI)</li>
                          ))}
                        </ul>
                        Mohon lakukan isi ulang segera.
                      </div>
                    </div>
                  </div>
                )}

                {(() => {
                  const currentMonthPrefix = todayStr.substring(0, 7);
                  const tripsThisMonth = activeTrips.filter(t => t.startTime && t.startTime.startsWith(currentMonthPrefix) && t.serviceType !== 'jenazah');
                  const total = tripsThisMonth.length === 0 ? 1 : tripsThisMonth.length; 
                  
                  const countRed = tripsThisMonth.filter(t => t.triage === 'Merah').length;
                  const countYellow = tripsThisMonth.filter(t => t.triage === 'Kuning').length;
                  const countGreen = tripsThisMonth.filter(t => t.triage === 'Hijau').length;
                  
                  const pctRed = tripsThisMonth.length === 0 ? 0 : Math.round((countRed / total) * 100);
                  const pctYellow = tripsThisMonth.length === 0 ? 0 : Math.round((countYellow / total) * 100);
                  const pctGreen = tripsThisMonth.length === 0 ? 0 : Math.round((countGreen / total) * 100);

                  return (
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex justify-between">
                        Rasio Triase Pasien Rujukan (Bulan Ini)
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">Total: {tripsThisMonth.length} Pasien</span>
                      </p>
                      
                      {tripsThisMonth.length === 0 ? (
                        <div className="w-full bg-slate-100 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-slate-400">Belum ada data bulan ini</div>
                      ) : (
                        <div className="w-full h-4 flex rounded-full overflow-hidden bg-slate-100">
                          {pctRed > 0 && <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${pctRed}%` }} title={`Merah ${pctRed}%`}></div>}
                          {pctYellow > 0 && <div className="bg-yellow-500 h-full transition-all duration-1000" style={{ width: `${pctYellow}%` }} title={`Kuning ${pctYellow}%`}></div>}
                          {pctGreen > 0 && <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${pctGreen}%` }} title={`Hijau ${pctGreen}%`}></div>}
                        </div>
                      )}
                      
                      <div className="flex justify-between mt-2 text-[9px] font-black uppercase text-slate-400">
                        <span className="text-red-500">Merah ({pctRed}%)</span> 
                        <span className="text-yellow-600">Kuning ({pctYellow}%)</span> 
                        <span className="text-emerald-500">Hijau ({pctGreen}%)</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 z-10 relative">Total Rujukan Aktif</p>
                    <h3 className="text-5xl font-black text-blue-900 z-10 relative">{visibleTrips.length}</h3>
                    <Activity className="absolute -right-4 -bottom-4 text-slate-50 opacity-50 group-hover:scale-110 transition-transform" size={120} />
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 z-10 relative">Status Armada</p>
                    <div className="flex items-center gap-2 text-emerald-600 z-10 relative"><CheckCircle2 size={24} /><span className="text-2xl font-black uppercase">Ready</span></div>
                    <Truck className="absolute -right-4 -bottom-4 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform" size={120} />
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden hidden lg:block group">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 z-10 relative">Total Trip Selesai</p>
                    <h3 className="text-5xl font-black text-indigo-900 z-10 relative">{filteredHistory.length}</h3>
                    <History className="absolute -right-4 -bottom-4 text-indigo-50 opacity-50 group-hover:scale-110 transition-transform" size={120} />
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden hidden lg:block group">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 z-10 relative">Akun Terdaftar</p>
                    <h3 className="text-5xl font-black text-orange-900 z-10 relative">{Object.keys(appUsers).length}</h3>
                    <User className="absolute -right-4 -bottom-4 text-orange-50 opacity-50 group-hover:scale-110 transition-transform" size={120} />
                  </div>
                </div>

                <div className="bg-indigo-950 text-white p-6 lg:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                  <h3 className="text-xl lg:text-2xl font-black mb-6 relative z-10 flex items-center gap-3">
                    <Activity size={28} className="text-blue-400 animate-pulse" /> Papan Pemantauan (Live)
                  </h3>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10">
                    {visibleTrips.length === 0 && (
                      <p className="text-indigo-300 font-bold uppercase tracking-widest col-span-full py-10 text-center bg-white/5 rounded-2xl border border-white/10">Tidak ada pergerakan armada saat ini.</p>
                    )}
                    {visibleTrips.map(trip => {
                      const tColor = getTriageColor(trip.triage);
                      return (
                        <div key={trip.id} onClick={() => { setSelectedTrip(trip); setView('tripDetail'); }} className="bg-white p-5 lg:p-8 rounded-[2rem] border-l-8 border-y border-r border-slate-100 shadow-lg text-slate-800 flex flex-col justify-between cursor-pointer hover:shadow-2xl hover:-translate-y-2 hover:ring-4 ring-indigo-500/20 transition-all group" style={{ borderLeftColor: trip.triage === 'Merah' ? '#ef4444' : trip.triage === 'Kuning' ? '#eab308' : trip.triage === 'Hitam' ? '#1e293b' : '#10b981' }}>
                          <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                            <div>
                              <p className="text-xl font-black text-blue-950 mb-2">{trip.patientName}</p>
                              <div className="flex gap-2 flex-wrap mb-2">
                                {trip.serviceType === 'jenazah' ? (
                                  <span className="text-[10px] px-2 py-1 rounded-md font-black uppercase bg-slate-800 text-slate-100">JENAZAH</span>
                                ) : (
                                  <span className={`text-[10px] px-2 py-1 rounded-md font-black uppercase ${tColor.bg} ${tColor.text}`}>{trip.triage}</span>
                                )}
                                <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase border ${trip.paymentStatus === 'BPJS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{trip.paymentStatus || 'UMUM'}</span>
                              </div>
                              <p className="text-sm text-slate-500 font-bold bg-slate-50 inline-block px-3 py-1.5 rounded-lg mb-1 border border-slate-100">{trip.serviceType === 'jenazah' ? 'Ket: ' : 'Dx: '} {trip.diagnosis}</p><br />
                              {trip.dpjp !== '-' && <p className="text-xs text-indigo-700 font-bold bg-indigo-50 inline-block px-3 py-1.5 mt-2 rounded border border-indigo-100">DPJP: {trip.dpjp}</p>}
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <p className={`text-xs font-black tracking-widest uppercase px-4 py-2 rounded-lg ${trip.status === 'PENDING' ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-indigo-100 text-indigo-600 shadow-sm'}`}>{trip.status === 'PENDING' ? 'MENCARI DRIVER' : 'ON THE WAY'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs lg:text-sm">
                            <div>
                              <p className="text-slate-400 font-bold uppercase mb-1 text-[10px]">Rute Ambulans</p>
                              <p className="font-black text-slate-700 leading-tight">{trip.origin} <br/><span className="text-slate-300">↓</span><br/> {trip.destination}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-400 font-bold uppercase mb-1 text-[10px]">Durasi Aktif</p>
                              <p className="font-black text-blue-600 bg-blue-50 py-1.5 px-3 rounded-lg inline-block border border-blue-100 text-lg">{getDuration(trip.startTime)} Menit</p>
                            </div>
                            <div className="col-span-2 flex justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                              <div>
                                <p className="text-slate-400 font-bold uppercase mb-1 text-[10px]">Perawat/Petugas</p>
                                <p className="font-black text-slate-700 flex items-center gap-1.5"><Stethoscope size={16} className="text-emerald-500" /> {trip.nurse || '-'}</p>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <p className="text-slate-400 font-bold uppercase mb-1 text-[10px]">Driver Ambulans</p>
                                <p className="font-black text-slate-700 flex items-center gap-1.5">{trip.driver || 'Mencari...'} <Truck size={16} className={trip.status === 'PENDING' ? 'text-orange-400' : 'text-blue-500'} /></p>
                              </div>
                            </div>
                          </div>
                          {trip.status === 'OTW' && (
                            <div className="mt-6 pt-6 border-t border-slate-100">
                              <h4 className="text-xs font-black uppercase text-blue-900 mb-3 flex items-center gap-1.5"><MapPin size={16} /> Posisi GPS Ambulans <span className="text-emerald-500 animate-pulse">(Live 🟢)</span></h4>
                              <div className="w-full h-[250px] lg:h-[350px] rounded-2xl overflow-hidden relative border border-slate-200 shadow-inner z-0 group/map">
                                <button onClick={(e) => { e.stopPropagation(); setFullScreenMapId(trip.id); }} className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur hover:bg-white p-2.5 rounded-xl shadow-lg text-blue-600 transition-all hover:scale-105 flex items-center gap-2 border border-blue-100">
                                  <Maximize size={16} /> <span className="text-[10px] font-black uppercase hidden lg:block">Penuh</span>
                                </button>
                                <NativeMapRender 
                                  initialLat={-3.1950} 
                                  initialLng={102.1648} 
                                  mapId={`map-${trip.id}`} 
                                  trackingId={trip.id} 
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <BarChart3 className="absolute -right-10 -bottom-10 opacity-5 text-white pointer-events-none" size={300} />
                </div>
              </div>
            )}

            {role === 'superadmin' && view === 'superadmin' && (
              <div className="space-y-6 animate-in fade-in pb-10">
                <div className="bg-slate-900 text-white p-6 lg:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                  <h3 className="text-2xl lg:text-3xl font-black mb-2 relative z-10 flex items-center gap-3"><Key size={32} className="text-emerald-400"/> SUPER ADMIN PANEL</h3>
                  <p className="text-sm font-medium opacity-80 relative z-10">Manajemen Akses, Kredensial & Pengguna Sistem SI-ELANG.</p>
                  <Key className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none" size={150} />
                </div>
                
                <div className="lg:hidden flex justify-between items-center bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200">
                    <div>
                        <h4 className="font-black text-blue-900">Form Pengguna</h4>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">Tambah / edit akun petugas</p>
                    </div>
                    <button
                        onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md text-white ${isMobileFormOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isMobileFormOpen ? 'Tutup Form' : '+ Tambah Baru'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className={`lg:col-span-4 bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-200 h-max sticky top-6 ${isMobileFormOpen ? 'block animate-in slide-in-from-top-4' : 'hidden lg:block'}`}>
                    <h4 className="text-base font-black text-blue-900 mb-6 flex items-center justify-between gap-2">
                       <span className="flex items-center gap-2"><User size={20}/> {editUserMode ? 'Edit Pengguna' : 'Tambah Baru'}</span>
                       <button className="lg:hidden text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg" onClick={() => setIsMobileFormOpen(false)}><X size={18}/></button>
                    </h4>
                    <form onSubmit={saveUserAccount} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Username Login</label>
                        <input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })} placeholder="driver2" className="w-full p-4 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-colors" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Tampilan</label>
                        <input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} placeholder="Budi Susanto" className="w-full p-4 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-colors" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Password Akses</label>
                        <input value={userForm.pass} onChange={e => setUserForm({ ...userForm, pass: e.target.value })} placeholder={editUserMode ? "Kosongkan jika tidak diubah" : "Password Baru"} className="w-full p-4 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-colors" required={!editUserMode} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Peran / Akses</label>
                        <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full p-4 mt-1 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-colors cursor-pointer" required>
                          <option value="driver">Driver / Sopir</option>
                          <option value="nurse">Perawat / Nakes</option>
                          <option value="doctor">Dokter / DPJP</option>
                          <option value="management">Manajemen / Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-sm transition-colors">SIMPAN</button>
                        {editUserMode && <button type="button" onClick={() => {setEditUserMode(false); setUserForm({username:'', name:'', pass:'', role:'nurse'}); setIsMobileFormOpen(false);}} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-4 rounded-2xl text-sm transition-colors">BATAL</button>}
                      </div>
                    </form>
                  </div>
                  <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50"><h4 className="text-base font-black text-blue-900">Daftar Akun Sistem Terdaftar</h4></div>
                    <div className="divide-y divide-slate-100">
                      {Object.entries({ ...DEFAULT_USERS, ...appUsers }).map(([uname, data]) => (
                        <div key={uname} className="p-4 lg:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-slate-50 transition-colors gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xl border border-blue-200 shrink-0">{data.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="text-base font-black text-slate-800">{data.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                 <p className="text-sm font-bold text-slate-500">@{uname}</p>
                                 <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-[10px] uppercase border border-blue-100">{data.role === 'management' ? 'manajemen' : data.role === 'doctor' ? 'dokter' : data.role === 'nurse' ? 'perawat' : data.role}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 self-end sm:self-auto">
                            <button onClick={() => editUserAccount(uname, { ...data, pass: '' })} className="px-4 py-2 sm:p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-2"><Edit size={16} /> <span className="text-xs font-bold sm:hidden">Edit</span></button>
                            <button onClick={() => deleteUserAccount(uname)} className="px-4 py-2 sm:p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2"><Trash2 size={16} /> <span className="text-xs font-bold sm:hidden">Hapus</span></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'history' && (
              <div className="animate-in fade-in space-y-6">
                <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                  <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-6 gap-4">
                    <h2 className="text-xl lg:text-2xl font-black text-blue-900 flex items-center gap-3"><History className="text-blue-500" size={28} /> RIWAYAT LAYANAN</h2>
                    <div className="flex gap-2">
                      <button onClick={exportToExcel} className="flex-1 lg:flex-none bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 border border-emerald-200 active:scale-95 hover:bg-emerald-100 transition-colors"><FileSpreadsheet size={16} /> UNDUH EXCEL</button>
                      <button onClick={exportToPDF} className="flex-1 lg:flex-none bg-red-50 text-red-700 px-4 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 border border-red-200 active:scale-95 hover:bg-red-100 transition-colors"><FileText size={16} /> UNDUH PDF</button>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 mb-8 shadow-sm">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><CalendarDays size={18} className="text-blue-500" /> Parameter Laporan</h3>
                        <p className="text-[10px] lg:text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Tentukan periode dan jenis layanan</p>
                      </div>
                      <div className="bg-slate-100/80 p-1.5 rounded-xl flex w-full lg:w-max border border-slate-200/60">
                        <button onClick={() => setFilterMode('date')} className={`flex-1 lg:w-36 py-2.5 px-4 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${filterMode === 'date' ? 'bg-white text-blue-700 shadow-sm border border-slate-200 scale-100' : 'text-slate-500 hover:text-slate-700 scale-95'}`}>Harian</button>
                        <button onClick={() => setFilterMode('month')} className={`flex-1 lg:w-36 py-2.5 px-4 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${filterMode === 'month' ? 'bg-white text-blue-700 shadow-sm border border-slate-200 scale-100' : 'text-slate-500 hover:text-slate-700 scale-95'}`}>Bulanan</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="group relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"><CalendarDays size={20} /></div>
                        <input type={filterMode === 'date' ? 'date' : 'month'} value={filterMode === 'date' ? historyFilter : historyFilter.slice(0, 7)} onChange={(e) => setHistoryFilter(e.target.value)} className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-blue-500 focus:bg-white p-4 pl-12 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all cursor-pointer shadow-sm" />
                      </div>
                      <div className="group relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"><BriefcaseMedical size={20} /></div>
                        <select value={historyServiceFilter} onChange={(e) => setHistoryServiceFilter(e.target.value)} className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-blue-500 focus:bg-white p-4 pl-12 rounded-2xl text-sm font-bold text-slate-700 outline-none cursor-pointer appearance-none transition-all shadow-sm">
                          <option value="all">Semua Layanan (Rujukan & Jenazah)</option>
                          <option value="rujukan">Rujukan Pasien Medis</option>
                          <option value="jenazah">Layanan Antar Jenazah</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-16 opacity-50 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                      <FileText size={64} className="mx-auto mb-4 text-slate-400" />
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Tidak ada riwayat pada periode ini.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm w-full">
                      <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                        <thead>
                          <tr className="bg-slate-100 text-[10px] lg:text-xs font-black uppercase text-slate-600 border-b-2 border-slate-300">
                            <th className="p-4 text-center w-16 border border-slate-300">No</th>
                            <th className="p-4 border border-slate-300">Waktu</th>
                            <th className="p-4 border border-slate-300">Pasien/Jenazah</th>
                            <th className="p-4 border border-slate-300">Rute Perjalanan</th>
                            <th className="p-4 border border-slate-300">Tim Medis</th>
                            <th className="p-4 text-center border border-slate-300">KM</th>
                            <th className="p-4 text-center border border-slate-300">Bukti Foto (KM)</th>
                            <th className="p-4 text-center border border-slate-300">Berkas Rujukan</th>
                            <th className="p-4 text-center border border-slate-300">Durasi</th>
                            {role === 'superadmin' && <th className="p-4 text-center border border-slate-300">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="text-xs lg:text-sm font-medium">
                          {filteredHistory.map((trip, index) => {
                            const tColor = getTriageColor(trip.triage);
                            const totalKm = (trip.kmEndValue && trip.kmStartValue) ? (trip.kmEndValue - trip.kmStartValue) : '-';
                            return (
                              <tr key={trip.id} className="border-b border-slate-200 hover:bg-blue-50/50 transition-colors">
                                <td className="p-4 text-center font-black text-slate-400 border border-slate-200">{index + 1}</td>
                                <td className="p-4 border border-slate-200">
                                  <span className="font-bold text-slate-700 block mb-1">{new Date(trip.startTime).toLocaleDateString('id-ID')}</span>
                                  <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded">B: {new Date(trip.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded ml-1">T: {trip.endTime ? new Date(trip.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                </td>
                                <td className="p-4 border border-slate-200">
                                  <p className="font-bold text-slate-900 flex items-center gap-2 mb-1">{trip.patientName} <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ${trip.serviceType === 'jenazah' ? 'bg-slate-800 border-slate-500' : `${tColor.bg} ${tColor.border}`}`}></span></p>
                                  {role !== 'driver' && <p className="text-xs text-slate-500 truncate max-w-[200px]">{trip.diagnosis}</p>}
                                </td>
                                <td className="p-4 text-xs text-slate-700 border border-slate-200 truncate max-w-[200px]">
                                  <span className="font-bold">{trip.origin}</span> <br/> <span className="text-slate-400">→</span> {trip.destination}
                                </td>
                                <td className="p-4 text-xs border border-slate-200">
                                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block mb-1"><Stethoscope size={12} className="inline mr-1"/> {trip.nurse}</span><br/>
                                  <span className="text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded inline-block"><Truck size={12} className="inline mr-1"/> {trip.driver}</span>
                                </td>
                                <td className="p-4 text-center font-black text-slate-800 border border-slate-200">
                                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 block mb-1">{totalKm}</span>
                                  <span className="text-[9px] text-slate-400 font-bold block bg-white px-1 py-0.5 rounded border border-slate-100">{trip.kmStartValue || '-'} → {trip.kmEndValue || '-'}</span>
                                </td>
                                
                                <td className="p-4 text-center border border-slate-200">
                                  <div className="flex items-center justify-center gap-2">
                                    {trip.kmStartPhoto ? (
                                      <img src={trip.kmStartPhoto} alt="Awal" onClick={() => downloadFile(trip.kmStartPhoto, `KM_Awal_${trip.patientName.replace(/\s+/g, '_')}.jpg`)} className="w-10 h-10 object-cover rounded border border-slate-300 hover:scale-[2.5] origin-center transition-transform z-10 relative cursor-pointer shadow-sm re-invert" title={`Klik Unduh KM Awal: ${trip.kmStartValue}`} />
                                    ) : (
                                      <div className="w-10 h-10 bg-slate-100 rounded border border-slate-200 border-dashed flex items-center justify-center text-[8px] text-slate-400">N/A</div>
                                    )}
                                    {trip.kmEndPhoto ? (
                                      <img src={trip.kmEndPhoto} alt="Akhir" onClick={() => downloadFile(trip.kmEndPhoto, `KM_Akhir_${trip.patientName.replace(/\s+/g, '_')}.jpg`)} className="w-10 h-10 object-cover rounded border border-slate-300 hover:scale-[2.5] origin-center transition-transform z-10 relative cursor-pointer shadow-sm re-invert" title={`Klik Unduh KM Akhir: ${trip.kmEndValue}`} />
                                    ) : (
                                      <div className="w-10 h-10 bg-slate-100 rounded border border-slate-200 border-dashed flex items-center justify-center text-[8px] text-slate-400">N/A</div>
                                    )}
                                  </div>
                                </td>

                                <td className="p-4 text-center border border-slate-200">
                                  <div className="flex flex-col items-center gap-2">
                                    {trip.referralDocs?.length > 0 ? (
                                      <div className="flex flex-wrap justify-center gap-1.5 max-w-[150px] mx-auto">
                                        {trip.referralDocs.map(docItem => (
                                          docItem.type.startsWith('image/') ? (
                                            <div key={docItem.id} className="relative group/doc cursor-pointer">
                                              <img src={docItem.url} alt={docItem.name} onClick={() => downloadFile(docItem.url, docItem.name)} className="w-10 h-10 object-cover rounded border border-slate-300 hover:scale-[2.5] origin-center transition-transform z-10 relative shadow-sm re-invert" title={`Klik untuk Unduh Foto: ${docItem.name}`} />
                                            </div>
                                          ) : (
                                            <button key={docItem.id} onClick={() => downloadFile(docItem.url, docItem.name)} className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 w-10 h-10 rounded border border-blue-200 transition-colors shadow-sm" title={`Unduh PDF: ${docItem.name}`}>
                                              <FileText size={16} />
                                            </button>
                                          )
                                        ))}
                                      </div>
                                    ) : trip.referralDoc ? (
                                      <div className="flex justify-center">
                                        {trip.referralDocType?.startsWith('image/') || trip.referralDoc.startsWith('data:image') ? (
                                          <div className="relative group/doc cursor-pointer">
                                            <img src={trip.referralDoc} alt={trip.referralDocName || 'berkas'} onClick={() => downloadFile(trip.referralDoc, trip.referralDocName || 'berkas_lama')} className="w-10 h-10 object-cover rounded border border-slate-300 hover:scale-[2.5] origin-center transition-transform z-10 relative shadow-sm re-invert" title={`Klik untuk Unduh Foto: ${trip.referralDocName || 'Berkas Lama'}`} />
                                          </div>
                                        ) : (
                                          <button onClick={() => downloadFile(trip.referralDoc, trip.referralDocName || 'berkas_lama')} className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 w-10 h-10 rounded border border-blue-200 transition-colors shadow-sm" title={trip.referralDocName || 'Berkas Rujukan'}>
                                            <FileText size={16} />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium">N/A</span>
                                    )}

                                    {role === 'nurse' && (
                                      <label className="mt-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase cursor-pointer transition-colors shadow-sm inline-flex items-center gap-1.5 w-max">
                                        <UploadCloud size={12} /> + Surat Balik
                                        <input type="file" multiple accept=".pdf,image/png,image/jpeg,image/jpg" className="hidden" onChange={(e) => uploadHistoryDocument(e, trip)} disabled={loading} />
                                      </label>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-center text-blue-600 font-black border border-slate-200">
                                  <span className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">{getDuration(trip.startTime, trip.endTime)}m</span>
                                </td>

                                {role === 'superadmin' && (
                                  <td className="p-4 text-center border border-slate-200">
                                    <button onClick={() => setTripToDelete(trip)} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors shadow-sm" title="Hapus Permanen">
                                       <Trash2 size={16} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'tripDetail' && selectedTrip && (
              <div className="animate-in slide-in-from-right space-y-6 pb-10">
                <div className={`rounded-[2.5rem] p-6 lg:p-8 text-white shadow-xl relative overflow-hidden transition-colors ${selectedTrip.serviceType === 'jenazah' ? 'bg-slate-800' : (selectedTrip.triage === 'Merah' ? 'bg-red-900' : selectedTrip.triage === 'Kuning' ? 'bg-yellow-700' : 'bg-blue-900')}`}>
                  <div className="flex justify-between items-center w-full mb-4 z-20 relative">
                    <button onClick={() => setView('home')} className="text-[10px] lg:text-xs font-black opacity-60 hover:opacity-100 hover:bg-white/10 px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-2 border border-transparent transition-colors">
                      ← Kembali ke Dasbor
                    </button>
                    {(selectedTrip.creatorId === username || role === 'superadmin' || role === 'management') && selectedTrip.status !== 'COMPLETED' && (
                      <button onClick={() => setActiveTripToCancel(selectedTrip)} className="text-[10px] lg:text-xs font-black bg-red-500/20 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-2 border border-red-400/50 hover:border-red-500 transition-colors shadow-sm backdrop-blur-sm">
                        <Trash2 size={14} /> Batalkan Rujukan
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div>
                      <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 opacity-80">
                        {selectedTrip.serviceType === 'jenazah' ? <><ShieldCheck size={14} /> Layanan Antar Jenazah</> : <><Activity size={14} className="animate-pulse" /> Live Monitoring Rujukan</>}
                      </p>
                      <h2 className="text-3xl lg:text-5xl font-black tracking-tighter leading-tight mt-1">
                        {maskSensitiveData(selectedTrip.patientName, role, selectedTrip.status)}
                      </h2>
                      <p className="text-sm font-medium opacity-90 mt-2 bg-black/20 px-3 py-1 rounded-lg w-max border border-white/10">
                        {selectedTrip.gender === 'L' ? 'Laki-laki' : (selectedTrip.gender === 'P' ? 'Perempuan' : '')}, {selectedTrip.age} Tahun
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {role !== 'driver' && (
                          <p className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg border border-white/20">{selectedTrip.serviceType === 'jenazah' ? 'Ket: ' : 'Dx: '} {maskSensitiveData(selectedTrip.diagnosis, role, selectedTrip.status) || '-'}</p>
                        )}
                        {selectedTrip.serviceType !== 'jenazah' && <p className="text-xs font-black uppercase bg-black/40 px-3 py-1.5 rounded-lg">Triase {selectedTrip.triage}</p>}
                        <p className={`text-xs font-black uppercase px-3 py-1.5 rounded-lg border border-white/20 ${selectedTrip.paymentStatus === 'BPJS' ? 'bg-emerald-500/50 text-emerald-100' : 'bg-blue-500/50 text-blue-100'}`}>{selectedTrip.paymentStatus || 'UMUM'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 min-w-[250px]">
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                        <Clock size={28} className="opacity-80 text-blue-200" />
                        <div>
                          <p className="text-[10px] font-black uppercase opacity-80 text-blue-200">Durasi</p>
                          <p className="text-2xl font-black">{getDuration(selectedTrip.startTime, selectedTrip.endTime)} Menit</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrip.dpjp !== '-' && role !== 'driver' && <p className="flex-1 text-[10px] font-bold bg-white/10 px-3 py-2 rounded-xl border border-white/20 flex items-center gap-2"><User size={14} /> Dr: {selectedTrip.dpjp}</p>}
                        <p className="flex-1 text-[10px] font-bold bg-white/10 px-3 py-2 rounded-xl border border-white/20 flex items-center gap-2"><Stethoscope size={14} /> P: {selectedTrip.nurse}</p>
                        <p className="flex-1 text-[10px] font-bold bg-white/10 px-3 py-2 rounded-xl border border-white/20 flex items-center gap-2"><Truck size={14} /> D: {selectedTrip.driver}</p>
                      </div>
                    </div>
                  </div>
                  {selectedTrip.serviceType !== 'jenazah' && role !== 'driver' && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 relative z-10 border-t border-white/10 pt-6">
                      <div className="bg-white/10 border border-white/20 p-5 rounded-3xl">
                        <div className="flex items-center gap-2 mb-2"><Heart size={20} className="text-red-300"/><span className="text-[10px] font-black uppercase opacity-90">Heart Rate</span></div>
                        <p className="text-4xl font-black">{selectedTrip.vitals?.hr || '--'} <span className="text-sm opacity-60">BPM</span></p>
                      </div>
                      <div className="bg-white/10 border border-white/20 p-5 rounded-3xl">
                        <div className="flex items-center gap-2 mb-2"><Droplets size={20} className="text-cyan-300"/><span className="text-[10px] font-black uppercase opacity-90">SpO2</span></div>
                        <p className="text-4xl font-black">{selectedTrip.vitals?.spo2 || '--'} <span className="text-sm opacity-60">%</span></p>
                      </div>
                      <div className="bg-white/10 border border-white/20 p-5 rounded-3xl">
                        <div className="flex items-center gap-2 mb-2"><Activity size={20} className="text-emerald-300"/><span className="text-[10px] font-black uppercase opacity-90">Tensi</span></div>
                        <p className="text-3xl font-black mt-1">{selectedTrip.vitals?.bp || '--'} <span className="text-xs opacity-60">mmHg</span></p>
                      </div>
                      <div className="bg-white/10 border border-white/20 p-5 rounded-3xl">
                        <div className="flex items-center gap-2 mb-2"><Thermometer size={20} className="text-orange-300"/><span className="text-[10px] font-black uppercase opacity-90">Suhu</span></div>
                        <p className="text-3xl font-black mt-1">{selectedTrip.vitals?.temp || '--'} <span className="text-sm opacity-60">°C</span></p>
                      </div>
                    </div>
                  )}
                  <div className="absolute right-[-40px] top-[-40px] opacity-10 -rotate-12 pointer-events-none"><Activity size={350} /></div>
                </div>

                {role === 'driver' ? (
                  <div className="max-w-2xl mx-auto flex flex-col gap-6 w-full">
                    {renderOdometerPanel()}
                    {renderEConsentPanel()}
                    {renderFinishButton()}
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {(role === 'nurse' && selectedTrip.serviceType !== 'jenazah') ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {renderTTVPanel()}
                        <div className="flex flex-col gap-6">
                          {renderEConsentPanel()}
                          {renderDocumentUploadPanel()}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {renderEConsentPanel()}
                        {selectedTrip.serviceType !== 'jenazah' && renderDocumentUploadPanel()}
                      </div>
                    )}
                    <div className="w-full">
                      {renderChatPanel()}
                    </div>
                  </div>
                )}
                
              </div>
            )}
          </div>
        </main>

        {view !== 'login' && (
          <nav className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2.5rem] px-6 py-4 flex justify-between items-center z-[70]">
            <button onClick={() => { setView(role === 'management' ? 'management' : (role === 'superadmin' ? 'superadmin' : 'home')); setSelectedTrip(null); }} className={`flex flex-col items-center gap-1 w-16 transition-all ${(view === 'home' || view === 'management' || view === 'superadmin') ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
              <LayoutDashboard size={20} strokeWidth={2.5} /><span className="text-[8px] font-black uppercase">Dasbor</span>
            </button>
            <button onClick={() => { setView('history'); setSelectedTrip(null); }} className={`flex flex-col items-center gap-1 w-16 transition-all ${view === 'history' ? 'text-blue-600 scale-110' : 'text-slate-400'}`}>
              <History size={20} strokeWidth={2.5} /><span className="text-[8px] font-black uppercase">Riwayat</span>
            </button>
            <button onClick={() => setView(role === 'superadmin' ? 'superadmin' : 'home')} className="relative w-16 flex justify-center group">
              <div className={`absolute -top-14 p-5 rounded-full shadow-2xl border-4 border-white transition-all ${dailyCheck || nurseCheck ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-400'}`}>
                <Activity size={24} />
              </div>
            </button>
            <button onClick={() => { if (selectedTrip) setView('tripDetail'); else showToast('error', 'Pilih rujukan aktif di Dasbor dulu!'); }} className={`flex flex-col items-center gap-1 w-16 transition-all ${view === 'tripDetail' ? 'text-blue-600 scale-110' : 'text-slate-400'} ${!selectedTrip && 'opacity-30'}`}>
              <Navigation size={20} strokeWidth={2.5} /><span className="text-[8px] font-black uppercase">Monitor</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default App;
