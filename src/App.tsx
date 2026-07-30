import React, { useState, useEffect, useRef, FormEvent, TransitionEvent } from 'react';
import { 
  LogIn, 
  LogOut, 
  Loader2, 
  Sprout, 
  CheckCircle2, 
  ChevronRight, 
  Calculator, 
  FileText, 
  ClipboardList, 
  Send, 
  TrendingUp,
  MapPin,
  Calendar,
  Phone,
  Search,
  ShoppingCart,
  User as UserIcon,
  X,
  FileCheck2,
  Lock,
  AlertCircle,
  ChevronDown,
  Truck,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase-auth';
import { CatalogProduct } from './types';
import { CataloguePersonalization } from './features/personalization/CataloguePersonalization';
import { rankCatalogueProducts } from './features/personalization/ranking';
import {
  CataloguePreferences,
  CataloguePreferencesInput,
} from './features/personalization/types';
import {
  DeliveryLocationModal,
  SavedDeliveryLocation,
} from './features/delivery/DeliveryLocationModal';
import { DeliveryServiceStatus } from './features/delivery/serviceArea';
import { ProductCard } from './features/products/ProductCard';
import { ProductDetailPage } from './features/products/ProductDetailPage';
import { CategoryPage } from './features/seo/CategoryPage';
import { SeoHead } from './features/seo/SeoHead';
import { createFaqSchema, FAQ_ITEMS } from './features/seo/faq';
import {
  CATEGORY_SEO_CONTENT,
  createOrganizationSchemas,
  DEFAULT_SOCIAL_IMAGE,
} from './features/seo/seo';

// Banner image imports
import carrotsImg from './assets/images/1.webp';
import orangesImg from './assets/images/2.webp';
import spinachImg from './assets/images/3.webp';
import microgreensImg from './assets/images/4.webp';
import tomatoesImg from './assets/images/5.webp';

function getProductPriceRange(prod: CatalogProduct & Record<string, any>): string {
  if (prod.priceRange && typeof prod.priceRange === 'string') {
    return prod.priceRange;
  }
  if (prod.variants && prod.variants.length > 0) {
    const validPrices = prod.variants
      .map(v => typeof v.sellingPrice === 'number' ? v.sellingPrice : (typeof v.price === 'number' ? v.price : 0))
      .filter(p => p > 0);
    if (validPrices.length > 0) {
      const minP = Math.min(...validPrices);
      const maxP = Math.max(...validPrices);
      const label = prod.variants[0]?.label ? ` / ${prod.variants[0].label}` : ' / kg';
      if (minP === maxP) {
        return `₹${minP}${label}`;
      }
      return `₹${minP} - ₹${maxP} / kg`;
    }
  }
  return '₹50 - ₹80 / kg';
}

function getProductFarmSource(prod: CatalogProduct & Record<string, any>): string {
  if (prod.farmSource && typeof prod.farmSource === 'string') {
    return prod.farmSource;
  }
  if (prod.shortIntro) {
    return prod.shortIntro.length > 65 ? prod.shortIntro.slice(0, 62) + '...' : prod.shortIntro;
  }
  return 'Karnataka Regenerative Partner Farm';
}

function getProductWeeklyTestStatus(prod: CatalogProduct & Record<string, any>): string {
  if (prod.weeklyTestStatus && typeof prod.weeklyTestStatus === 'string') {
    return prod.weeklyTestStatus;
  }
  return 'Passed - Nil Pesticides detected';
}

function getProductDescription(prod: CatalogProduct & Record<string, any>): string {
  return prod.shortIntro || prod.description || 'Pesticide-free fresh farm harvest.';
}

interface LabReport {
  id: string;
  testDate: string;
  batchId: string;
  labName: string;
  pesticideScanCount: number;
  result: string;
  status: string;
  downloadUrl: string;
}

interface Inquiry {
  id: number;
  restaurantName: string;
  contactNumber: string;
  items: string;
  estimatedCost: string;
  status: string;
  createdAt: string;
}

const bannerItems = [
  { image: carrotsImg, title: "Organic Nantes Carrots", alt: "Sweet Carrots" },
  { image: orangesImg, title: "Valencia Field Oranges", alt: "Coorg Oranges" },
  { image: spinachImg, title: "Heirloom English Spinach", alt: "Crimson Spinach" },
  { image: microgreensImg, title: "Rainbow Micro-Sprouts", alt: "Specialty Microgreens" },
  { image: tomatoesImg, title: "Vined Cherry Tomatoes", alt: "Vine-Ripe Tomatoes" }
];

const loopedBannerItems = [...bannerItems, ...bannerItems, ...bannerItems];

const categoryCards = [
  { id: 'vegetables', name: 'Vegetables', image: '/vegetables-1.webp', bgClass: 'circle-bg-1' },
  { id: 'fruits', name: 'Fruits', image: '/fruits-1.webp', bgClass: 'circle-bg-2' },
  { id: 'leafy-greens', name: 'Leafy Greens', image: '/leafygreens-1.webp', bgClass: 'circle-bg-3' },
  { id: 'microgreens', name: 'Microgreens', image: '/microgreens-1.webp', bgClass: 'circle-bg-4' },
  { id: 'mushrooms', name: 'Mushrooms', image: '/mushrooms-1.webp', bgClass: 'circle-bg-5' },
  { id: 'exotics', name: 'Exotics', image: '/exotics-1.webp', bgClass: 'circle-bg-6' },
];

const faqData = FAQ_ITEMS;

const HOME_SCHEMAS = [
  ...createOrganizationSchemas(),
  createFaqSchema(),
];

const getNormalizedPath = (): string => {
  let path = window.location.pathname || '/';

  if (window.location.hash) {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash.startsWith('/')) {
      path = hash;
    } else if (hash.length > 0) {
      path = '/' + hash;
    }
  }

  path = path.split('?')[0].split('#')[0];

  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path.toLowerCase();
};

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(getNormalizedPath());
  const [user, setUser] = useState<User | any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // UI Navigation & Dropdown State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Delivery Location State
  const [selectedLocation, setSelectedLocation] =
    useState<SavedDeliveryLocation | null>(null);
  const [deliveryServiceStatus, setDeliveryServiceStatus] =
    useState<DeliveryServiceStatus>('unknown');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Workspace Tabs State
  const [activeTab, setActiveTab] = useState<'catalog' | 'reports' | 'estimator' | 'inquiries'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Products');
  const [searchQuery, setSearchQuery] = useState<string>(
    () => new URLSearchParams(window.location.search).get('search') || ''
  );

  // Handle header search typing with smooth scroll to catalogue
  const handleHeaderSearch = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 0) {
      setActiveTab('catalog');
      const el = document.getElementById('catalog-workspace') || document.getElementById('produce');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Data State
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [cataloguePreferences, setCataloguePreferences] = useState<CataloguePreferences | null>(null);
  const [personalizationLoading, setPersonalizationLoading] = useState<boolean>(true);
  const [personalizationSaving, setPersonalizationSaving] = useState<boolean>(false);
  const [personalizationError, setPersonalizationError] = useState<string | null>(null);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [myInquiries, setMyInquiries] = useState<Inquiry[]>([]);

  // Estimator State
  const [dailyRequirementKg, setDailyRequirementKg] = useState<number>(50);
  const [estimateQuantities, setEstimateQuantities] = useState<Record<string, number>>({});

  // Inquiry Form State
  const [restaurantName, setRestaurantName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  // Moving Banner Carousel Index & Responsive & Drag/Interaction state
  const viewportRef = useRef<HTMLDivElement>(null);
  const [bannerSlideWidth, setBannerSlideWidth] = useState<number>(0);
  const [bannerIndex, setBannerIndex] = useState(5); // Start at middle set (Set 1)
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [isMobileBannerReady, setIsMobileBannerReady] = useState(false);

  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const visibleBannerCount = isMobile ? 1 : 2;
  const bannerCardWidth = isMobile
    ? bannerSlideWidth
    : Math.max(0, (bannerSlideWidth - 24) / 2);
  const bannerViewportHeight = bannerCardWidth * 10 / 16;

  const dragStartXRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);
  const isHorizontalDragRef = useRef<boolean | null>(null);
  const wheelAccumulatorRef = useRef<number>(0);
  const wheelLockRef = useRef<boolean>(false);
  const autoplayIntervalRef = useRef<number | null>(null);
  const autoplayResumeTimeoutRef = useRef<number | null>(null);
  const wheelUnlockTimeoutRef = useRef<number | null>(null);
  const mobileBannerReadyFrameRef = useRef<number | null>(null);
  const hasMeasuredMobileBannerRef = useRef(false);

  useEffect(() => {
    const updateBannerSlideWidth = () => {
      if (!viewportRef.current) return;

      const styles = window.getComputedStyle(viewportRef.current);
      const horizontalPadding =
        Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);

      setBannerSlideWidth(Math.max(0, viewportRef.current.clientWidth - horizontalPadding));

      if (window.innerWidth < 768 && !hasMeasuredMobileBannerRef.current) {
        hasMeasuredMobileBannerRef.current = true;
        mobileBannerReadyFrameRef.current = window.requestAnimationFrame(() => {
          setIsMobileBannerReady(true);
        });
      }
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      updateBannerSlideWidth();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && viewportRef.current) {
      resizeObserver = new ResizeObserver(updateBannerSlideWidth);
      resizeObserver.observe(viewportRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mobileBannerReadyFrameRef.current !== null) {
        window.cancelAnimationFrame(mobileBannerReadyFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(getNormalizedPath());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Lock scroll and listen for Escape key when mobile menu drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const clearAutoplayInterval = () => {
    if (autoplayIntervalRef.current !== null) {
      window.clearInterval(autoplayIntervalRef.current);
      autoplayIntervalRef.current = null;
    }
  };

  const pauseCarouselAutoplay = () => {
    clearAutoplayInterval();
    if (autoplayResumeTimeoutRef.current !== null) {
      window.clearTimeout(autoplayResumeTimeoutRef.current);
      autoplayResumeTimeoutRef.current = null;
    }
    setIsAutoplayPaused(true);
  };

  const scheduleCarouselAutoplayResume = () => {
    if (autoplayResumeTimeoutRef.current !== null) {
      window.clearTimeout(autoplayResumeTimeoutRef.current);
    }
    autoplayResumeTimeoutRef.current = window.setTimeout(() => {
      autoplayResumeTimeoutRef.current = null;
      setIsAutoplayPaused(false);
    }, 3000);
  };

  useEffect(() => {
    clearAutoplayInterval();
    if (isAutoplayPaused) return;

    autoplayIntervalRef.current = window.setInterval(() => {
      setIsTransitioning(true);
      setBannerIndex((prev) => prev + 1);
    }, 4500);

    return clearAutoplayInterval;
  }, [isAutoplayPaused]);

  useEffect(() => {
    return () => {
      clearAutoplayInterval();
      if (autoplayResumeTimeoutRef.current !== null) {
        window.clearTimeout(autoplayResumeTimeoutRef.current);
      }
      if (wheelUnlockTimeoutRef.current !== null) {
        window.clearTimeout(wheelUnlockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const handleBannerTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'transform') return;

    if (bannerIndex >= 10) {
      setIsTransitioning(false);
      setBannerIndex(5 + (bannerIndex % 5));
    } else if (bannerIndex < 5) {
      setIsTransitioning(false);
      setBannerIndex(5 + (((bannerIndex % 5) + 5) % 5));
    }
  };

  const DRAG_THRESHOLD = 50; // 50px drag threshold to change slide

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    pauseCarouselAutoplay();
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    activePointerIdRef.current = e.pointerId;
    isHorizontalDragRef.current = null;
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    const deltaX = e.clientX - dragStartXRef.current;
    const deltaY = e.clientY - dragStartYRef.current;

    if (isHorizontalDragRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          isHorizontalDragRef.current = true;
          setIsDragging(true);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (_) {}
        } else {
          isHorizontalDragRef.current = false;
        }
      }
    }

    if (isHorizontalDragRef.current === true) {
      setDragOffset(deltaX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (isHorizontalDragRef.current === true && isDragging) {
      const deltaX = e.clientX - dragStartXRef.current;
      setIsTransitioning(true);

      if (deltaX < -DRAG_THRESHOLD) {
        setBannerIndex((prev) => prev + 1);
      } else if (deltaX > DRAG_THRESHOLD) {
        setBannerIndex((prev) => prev - 1);
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    isHorizontalDragRef.current = null;
    activePointerIdRef.current = null;
    scheduleCarouselAutoplayResume();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      setIsDragging(false);
      setDragOffset(0);
      isHorizontalDragRef.current = null;
      activePointerIdRef.current = null;
      scheduleCarouselAutoplayResume();
    }
  };

  const WHEEL_THRESHOLD = 40; // 40px threshold for horizontal scroll/wheel gesture

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const isHorizontalWheel = Math.abs(e.deltaX) > Math.abs(e.deltaY) || (e.shiftKey && Math.abs(e.deltaY) > 0);

    if (!isHorizontalWheel) {
      // Allow vertical page scrolling normally
      return;
    }

    pauseCarouselAutoplay();
    scheduleCarouselAutoplayResume();

    if (wheelLockRef.current) return;

    const delta = e.shiftKey && Math.abs(e.deltaY) > 0 ? e.deltaY : e.deltaX;
    wheelAccumulatorRef.current += delta;

    if (Math.abs(wheelAccumulatorRef.current) >= WHEEL_THRESHOLD) {
      wheelLockRef.current = true;
      setIsTransitioning(true);

      if (wheelAccumulatorRef.current > 0) {
        setBannerIndex((prev) => prev + 1);
      } else {
        setBannerIndex((prev) => prev - 1);
      }

      wheelAccumulatorRef.current = 0;

      if (wheelUnlockTimeoutRef.current !== null) {
        window.clearTimeout(wheelUnlockTimeoutRef.current);
      }
      wheelUnlockTimeoutRef.current = window.setTimeout(() => {
        wheelLockRef.current = false;
        wheelUnlockTimeoutRef.current = null;
      }, 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      pauseCarouselAutoplay();
      scheduleCarouselAutoplayResume();
      setIsTransitioning(true);
      setBannerIndex((prev) => prev - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      pauseCarouselAutoplay();
      scheduleCarouselAutoplayResume();
      setIsTransitioning(true);
      setBannerIndex((prev) => prev + 1);
    }
  };

  const navigateTo = (path: string) => {
    try {
      window.history.pushState({}, '', path);
    } catch (e) {
      console.warn('pushState error:', e);
    }
    const cleanPath = path.toLowerCase().split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
    const norm = getNormalizedPath();
    if (norm === '/' && cleanPath !== '/') {
      setCurrentPath(cleanPath);
    } else {
      setCurrentPath(norm);
    }
  };

  // Sync session with Express backend
  const syncUserSession = async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: currentUser.displayName,
          email: currentUser.email
        })
      });
      if (res.ok) {
        console.log('Session synchronized with backend');
      }
    } catch (err) {
      console.error('Failed to sync session:', err);
    }
  };

  // Fetch user inquiries
  const fetchMyInquiries = async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/inquiries/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            setMyInquiries(data);
          }
        } catch {
          // Ignore invalid non-JSON response gracefully
        }
      }
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    }
  };

  // Handle Login
  const handleLogin = async () => {
    setAuthError(null);
    try {
      setLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      let message = 'Google Sign-In failed. Please try again.';
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('auth/unauthorized-domain')) {
        message = `Google Sign-In requires adding "${typeof window !== 'undefined' ? window.location.hostname : 'this domain'}" to Authorized Domains in your Firebase Console (Authentication > Settings > Authorized Domains).`;
      } else if (error?.code === 'auth/popup-blocked') {
        message = 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (error?.code === 'auth/popup-closed-by-user') {
        message = 'The sign-in popup was closed before completion.';
      } else if (error?.message) {
        message = error.message;
      }
      setAuthError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      uid: 'demo-partner-kitchen-1',
      displayName: 'Bengaluru Chef Partner (Demo)',
      email: 'chef@soiltheory.in',
      photoURL: null,
      getIdToken: async () => 'demo-token-123'
    };
    setUser(demoUser);
    setAuthError(null);
  };

  const handleSaveCataloguePreferences = async (
    preferences: CataloguePreferencesInput
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      await handleLogin();
      throw new Error('Sign in is required to save catalogue preferences.');
    }

    setPersonalizationSaving(true);
    setPersonalizationError(null);
    try {
      const { saveCataloguePreferences } = await import('./services/personalizationService');
      const savedPreferences = await saveCataloguePreferences(currentUser.uid, preferences);
      setCataloguePreferences(savedPreferences);
    } catch (error: any) {
      const message =
        error?.message || 'We could not save your catalogue preferences. Please try again.';
      setPersonalizationError(message);
      throw error;
    } finally {
      setPersonalizationSaving(false);
    }
  };

  const handleDisableCataloguePreferences = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setPersonalizationSaving(true);
    setPersonalizationError(null);
    try {
      const { disableCataloguePreferences } = await import('./services/personalizationService');
      await disableCataloguePreferences(currentUser.uid);
      setCataloguePreferences((current) =>
        current ? { ...current, enabled: false } : null
      );
    } catch (error: any) {
      setPersonalizationError(
        error?.message || 'We could not disable personalization. Please try again.'
      );
    } finally {
      setPersonalizationSaving(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setMyInquiries([]);
    } catch (error) {
      console.error('Sign-Out failed:', error);
      setLoading(false);
    }
  };

  const loadProductsFromFirestore = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const { fetchProductsFromFirestore } = await import('./services/productService');
      const data = await fetchProductsFromFirestore();
      console.log(`[Produce Catalog] Loaded ${data.length} products from Firestore collection "products".`);
      setProducts(data);
    } catch (err: any) {
      console.error('[Produce Catalog Error] Failed to load products from Firestore "products" collection:', err);
      let errorMsg = 'Unable to connect to produce catalog database. Please check your network or try refreshing.';
      if (err instanceof Error && err.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) errorMsg = `Database error: ${parsed.error}`;
        } catch {
          errorMsg = err.message;
        }
      }
      setProductsError(errorMsg);
    } finally {
      setProductsLoading(false);
    }
  };

  // Load Initial Data
  useEffect(() => {
    let productsObserver: IntersectionObserver | null = null;
    const shouldLoadProductsImmediately =
      currentPath.startsWith('/produce/') || searchQuery.trim().length > 0;
    const catalogue = document.getElementById('catalog-workspace');

    if (
      shouldLoadProductsImmediately ||
      !catalogue ||
      typeof IntersectionObserver === 'undefined'
    ) {
      void loadProductsFromFirestore();
    } else {
      productsObserver = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          productsObserver?.disconnect();
          productsObserver = null;
          void loadProductsFromFirestore();
        },
        { rootMargin: '800px 0px' }
      );
      productsObserver.observe(catalogue);
    }

    const defaultReports: LabReport[] = [
      {
        id: "rep-2026-29",
        testDate: "July 18, 2026",
        batchId: "BATCH-BLR-0718",
        labName: "Karnataka Agri-Food Safety Laboratory, Bengaluru",
        pesticideScanCount: 148,
        result: "100% Chemical-Free / No Pesticide Residues Found",
        status: "Certified Safe",
        downloadUrl: "#",
      },
      {
        id: "rep-2026-28",
        testDate: "July 11, 2026",
        batchId: "BATCH-BLR-0711",
        labName: "Karnataka Agri-Food Safety Laboratory, Bengaluru",
        pesticideScanCount: 148,
        result: "100% Chemical-Free / No Pesticide Residues Found",
        status: "Certified Safe",
        downloadUrl: "#",
      },
      {
        id: "rep-2026-27",
        testDate: "July 04, 2026",
        batchId: "BATCH-BLR-0704",
        labName: "Karnataka Agri-Food Safety Laboratory, Bengaluru",
        pesticideScanCount: 148,
        result: "100% Chemical-Free / No Pesticide Residues Found",
        status: "Certified Safe",
        downloadUrl: "#",
      }
    ];

    setReports(defaultReports);

    fetch('/api/reports')
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setReports(data);
        }
      })
      .catch(() => {
        // Fallback reports are already set
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserSession(currentUser);
        await fetchMyInquiries(currentUser);
        setPersonalizationLoading(true);
        setPersonalizationError(null);
        try {
          const { fetchCataloguePreferences } = await import(
            './services/personalizationService'
          );
          const savedPreferences = await fetchCataloguePreferences(currentUser.uid);
          setCataloguePreferences(savedPreferences);
        } catch (error: any) {
          setPersonalizationError(
            error?.message || 'We could not load your catalogue preferences.'
          );
        } finally {
          setPersonalizationLoading(false);
        }
      } else {
        setCataloguePreferences(null);
        setPersonalizationLoading(false);
      }
      setLoading(false);
    });

    return () => {
      productsObserver?.disconnect();
      unsubscribe();
    };
  }, []);

  // Calculate dynamic weekly estimate
  const getEstimatedTotal = () => {
    let total = 0;
    const hasCustomQty = Object.values(estimateQuantities).some((q: number) => q > 0);
    
    if (hasCustomQty) {
      products.forEach((prod) => {
        const qty = estimateQuantities[prod.id] || 0;
        if (qty > 0) {
          let price = 68;
          if (prod.variants && prod.variants.length > 0) {
            const vPrice = typeof prod.variants[0].sellingPrice === 'number'
              ? prod.variants[0].sellingPrice
              : (typeof prod.variants[0].price === 'number' ? prod.variants[0].price : 68);
            if (vPrice > 0) price = vPrice;
          } else if ((prod as any).priceRange) {
            const match = String((prod as any).priceRange).match(/₹(\d+)/);
            if (match && match[1]) {
              price = parseInt(match[1], 10);
            }
          }

          if (qty >= 50) {
            price = price * 0.9;
          } else if (qty >= 20) {
            price = price * 0.95;
          }

          total += price * qty;
        }
      });
      return Math.round(total);
    }

    // Default monthly calculation based on slider
    return Math.round(dailyRequirementKg * 30 * 68);
  };

  // Submit Inquiry Form
  const handleSubmitInquiry = async (e: FormEvent) => {
    e.preventDefault();
    if (deliveryServiceStatus === 'unsupported') {
      return;
    }
    if (!user) {
      handleLogin();
      return;
    }
    
    setSubmittingInquiry(true);
    try {
      const token = await user.getIdToken();
      
      const itemsList = products
        .map((p) => {
          const qty = estimateQuantities[p.id] || 0;
          return qty > 0 ? `${p.name}: ${qty} kg` : null;
        })
        .filter(Boolean);

      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurantName,
          contactNumber,
          items: itemsList.length > 0 ? itemsList.join(', ') : `Daily Produce Requirement: ${dailyRequirementKg} kg/day`,
          estimatedCost: getEstimatedTotal()
        })
      });

      if (res.ok) {
        setInquirySuccess(true);
        setRestaurantName('');
        setContactNumber('');
        setEstimateQuantities({});
        await fetchMyInquiries(user);
        setTimeout(() => setInquirySuccess(false), 5000);
      }
    } catch (err) {
      console.error('Failed to submit inquiry:', err);
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // Cart Items Count
  const cartItemCount = Object.values(estimateQuantities).filter((q: number) => q > 0).length;
  const cartTotal = cartItemCount > 0 ? getEstimatedTotal() : 0;
  const canSendCartInquiry =
    cartItemCount > 0 && deliveryServiceStatus !== 'unsupported';

  const handleSaveDeliveryLocation = (location: SavedDeliveryLocation) => {
    setSelectedLocation(location);
    setDeliveryServiceStatus('supported');
    setIsLocationModalOpen(false);
  };

  const normalizedPath = currentPath;

  const categoryPathMatch = normalizedPath.match(/^\/produce\/category\/([^/]+)$/);
  if (categoryPathMatch) {
    const category = CATEGORY_SEO_CONTENT[decodeURIComponent(categoryPathMatch[1])];
    if (category) {
      const categoryProducts = products.filter((product) => {
        const activeState = product.isActive ?? (product as any).active ?? true;
        return activeState !== false && product.category === category.name;
      });

      return (
        <CategoryPage
          category={category}
          products={categoryProducts}
          isLoading={productsLoading}
          quantities={estimateQuantities}
          getPriceRange={getProductPriceRange}
          getFarmSource={getProductFarmSource}
          getWeeklyStatus={getProductWeeklyTestStatus}
          getDescription={getProductDescription}
          onBack={() => {
            navigateTo('/');
            window.setTimeout(() => {
              document.getElementById('catalog-workspace')?.scrollIntoView({ behavior: 'smooth' });
            }, 0);
          }}
          onNavigate={(path) => {
            navigateTo(path);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onAdd={(product) => {
            setEstimateQuantities((current) => ({
              ...current,
              [product.id]: (current[product.id] || 0) + 10,
            }));
          }}
        />
      );
    }
  }

  const productPathMatch = normalizedPath.match(/^\/produce\/([^/]+)$/);
  if (productPathMatch) {
    const productSlug = decodeURIComponent(productPathMatch[1]);
    const product = products.find((item) => item.slug.toLowerCase() === productSlug) || null;
    const productQuantity = product ? estimateQuantities[product.id] || 0 : 0;

    return (
      <ProductDetailPage
        product={product}
        isLoading={productsLoading}
        priceRange={product ? getProductPriceRange(product) : ''}
        farmSource={product ? getProductFarmSource(product) : ''}
        weeklyStatus={product ? getProductWeeklyTestStatus(product) : ''}
        currentQuantity={productQuantity}
        onBack={() => {
          navigateTo('/');
          window.setTimeout(() => {
            document.getElementById('catalog-workspace')?.scrollIntoView({ behavior: 'smooth' });
          }, 0);
        }}
        onAdd={() => {
          if (!product) return;
          setEstimateQuantities((current) => ({
            ...current,
            [product.id]: (current[product.id] || 0) + 10,
          }));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f4f0e7] text-[#183b2b] flex flex-col font-sans selection:bg-[#c9dc74] selection:text-[#183b2b]">
      <SeoHead
        title="Organic Produce Supply for Bengaluru Restaurants"
        description="The Soil Theory supplies traceable organic and pesticide-free fruits, vegetables, leafy greens, mushrooms and specialty produce to Bengaluru professional kitchens."
        canonicalPath="/"
        image={DEFAULT_SOCIAL_IMAGE}
        schemas={HOME_SCHEMAS}
      />
      
      {/* 1. Announcement Bar */}
      <div className="announcement">
        <span className="dot"></span> 
        <span>Now partnering with Bengaluru restaurants</span> 
        <a href="#contact">Enquire today</a>
      </div>

      {/* Auth Error Modal */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-stone-200 text-stone-800 relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">Partner Authentication Notice</h3>
                  <p className="text-xs text-stone-500">Google Sign-In configuration</p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-stone-700 leading-relaxed">
                {authError}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="flex-1 bg-[#183b2b] hover:bg-[#25543e] text-[#f4f0e7] font-medium text-xs py-2.5 px-4 rounded-xl transition-all text-center cursor-pointer"
                >
                  Sign In with Demo Partner Account
                </button>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs py-2.5 px-4 rounded-xl transition-all text-center cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeliveryLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSave={handleSaveDeliveryLocation}
        onServiceStatusChange={setDeliveryServiceStatus}
      />

      {/* 2. Site Header */}
      <header className="site-header-container">
        {/* Main Header Row */}
        <div className="site-header-main">
          {/* Left: Hamburger (Mobile/Tablet) & Logo & Desktop Delivery Block */}
          <div className="header-left">
            {/* Hamburger Menu Toggle (Mobile/Tablet) */}
            <button 
              type="button" 
              className={`menu-button xl:hidden ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <span></span>
              <span></span>
            </button>

            <a className="wordmark" href="/">
              <span>THE SOIL</span>
              <strong>THEORY</strong>
              <i></i>
            </a>

            {/* Desktop Only Delivery Location Block */}
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="header-location-block hidden md:flex"
              aria-label="Select delivery location"
            >
              <MapPin className="w-4 h-4 text-[#183b2b] shrink-0" />
              <div className="location-info">
                <span className="text-[#183b2b] font-bold text-xs flex items-center gap-1">
                  Delivery tomorrow
                </span>
                <span className="text-[11px] text-[#55705c] truncate max-w-[140px] xl:max-w-[190px] flex items-center gap-0.5">
                  {selectedLocation?.label || 'Select delivery location'}
                  <ChevronDown className="w-3 h-3 text-[#183b2b] shrink-0" />
                </span>
              </div>
            </button>
          </div>

          {/* Center: Desktop Wide Search Field */}
          <div className="header-search-container hidden md:flex">
            <div className="header-search-wrapper">
              <Search className="w-4 h-4 text-[#55705c] shrink-0" />
              <input
                type="text"
                placeholder="Search produce, categories or farms"
                value={searchQuery}
                onChange={(e) => handleHeaderSearch(e.target.value)}
                className="header-search-input"
                aria-label="Search produce, categories or farms"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="clear-search-btn"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Group: Text Links + Actions (Cart, Profile) */}
          <div className="header-right-group">
            {/* Inline Desktop Nav Links */}
            <nav className="header-inline-nav hidden xl:flex" aria-label="Main Navigation">
              <a href="#why">Why Soil Theory</a>
              <a href="#sourcing">How it works</a>
              <a href="#faq">FAQ</a>
            </nav>

            <div className="header-actions">
              {/* Harvest Cart Dropdown */}
              <div className="nav-cart-wrapper">
                <button 
                  type="button" 
                  className="nav-icon-btn" 
                  onClick={() => {
                    setIsCartOpen(!isCartOpen);
                    setIsProfileOpen(false);
                  }}
                  aria-label="Harvest Cart"
                >
                  <ShoppingCart className="w-5 h-5 text-[#183b2b]" />
                  {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
                </button>

                <div className={`cart-dropdown ${isCartOpen ? 'is-open' : ''}`}>
                  <div className="cart-dropdown-header">
                    <h4>Harvest Inquiry Cart</h4>
                    <span className="cart-item-count">{cartItemCount} items selected</span>
                  </div>
                  <div className="cart-dropdown-body">
                    {cartItemCount === 0 ? (
                      <div className="py-5 text-center">
                        <ShoppingCart className="mx-auto h-6 w-6 text-[#79966e]" aria-hidden="true" />
                        <p className="mt-2 text-sm font-semibold text-[#183b2b]">
                          Your harvest cart is empty
                        </p>
                        <p className="mt-1 text-xs text-[#55705c]">
                          Add produce from the catalogue to prepare an inquiry.
                        </p>
                      </div>
                    ) : (
                      products.map((prod) => {
                        const qty = estimateQuantities[prod.id] || 0;
                        if (qty <= 0) return null;
                        return (
                          <div key={prod.id} className="cart-item">
                            <div className="cart-item-details">
                              <span className="cart-item-title">{prod.name}</span>
                              <span className="cart-item-subtitle">{qty} kg • {getProductPriceRange(prod)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEstimateQuantities(prev => ({ ...prev, [prod.id]: 0 }))}
                              className="text-xs text-red-600 font-bold hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="cart-dropdown-footer">
                    <div className="cart-total-row">
                      <span>Subtotal</span>
                      <strong>₹{cartTotal.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="cart-total-row cart-total-row-final">
                      <span>Total</span>
                      <strong>₹{cartTotal.toLocaleString('en-IN')}</strong>
                    </div>
                    {deliveryServiceStatus === 'unsupported' && (
                      <p className="mb-3 text-xs font-semibold text-[#9a4d2f]" role="status">
                        We're expanding to your area soon.
                      </p>
                    )}
                    {canSendCartInquiry ? (
                      <a
                        href="#contact"
                        onClick={() => {
                          setIsCartOpen(false);
                          setActiveTab('inquiries');
                        }}
                        className="button button-dark cart-checkout-btn"
                      >
                        Send Inquiry <span>→</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="button button-dark cart-checkout-btn"
                      >
                        Send Inquiry <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* User Profile / Partner Dropdown */}
              <div className="nav-profile-wrapper">
                <button 
                  type="button" 
                  className="nav-icon-btn nav-profile-btn"
                  onClick={() => {
                    setIsProfileOpen(!isProfileOpen);
                    setIsCartOpen(false);
                  }}
                  aria-label="User Profile"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      width={36}
                      height={36}
                      decoding="async"
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : user ? (
                    <span className="profile-avatar">
                      <UserIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : (
                    <UserIcon className="w-5 h-5 text-[#f4f0e7]" />
                  )}
                </button>

                <div className={`profile-dropdown ${isProfileOpen ? 'is-open' : ''}`}>
                  {user ? (
                    <>
                      <div className="profile-dropdown-header">
                        <div className="profile-avatar-large">
                          <UserIcon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="profile-user-info">
                          <strong>{user.displayName || 'Chef Partner'}</strong>
                          <small>{user.email}</small>
                        </div>
                      </div>
                      <div className="profile-dropdown-menu">
                        <button 
                          onClick={() => {
                            setIsProfileOpen(false);
                            setActiveTab('inquiries');
                            const el = document.getElementById('catalog-workspace');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }} 
                          className="profile-menu-item w-full text-left"
                        >
                          <ClipboardList className="w-4 h-4 text-[#183b2b]" />
                          My Orders & Deliveries
                        </button>
                        <button 
                          onClick={() => {
                            setIsProfileOpen(false);
                            setActiveTab('reports');
                            const el = document.getElementById('catalog-workspace');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }} 
                          className="profile-menu-item w-full text-left"
                        >
                          <FileCheck2 className="w-4 h-4 text-[#183b2b]" />
                          Lab Test Reports & Quality
                        </button>
                        <a
                          href="#contact"
                          onClick={() => setIsProfileOpen(false)}
                          className="profile-menu-item w-full text-left flex items-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4 text-[#183b2b]" />
                          Talk to us <span>↗</span>
                        </a>
                        <div className="profile-dropdown-divider"></div>
                        <button 
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleLogout();
                          }} 
                          className="profile-menu-item logout-link w-full text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-700" />
                          Switch Account / Log Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="profile-dropdown-header">
                        <div className="profile-avatar-large bg-[#183b2b] text-[#f4f0e7] flex items-center justify-center font-bold">
                          <UserIcon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="profile-user-info">
                          <strong>Partner Portal</strong>
                          <small>Chef & Hospitality Partner</small>
                        </div>
                      </div>
                      <div className="profile-dropdown-menu">
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleLogin();
                          }}
                          className="profile-menu-item w-full text-left font-semibold text-[#183b2b] flex items-center gap-2"
                        >
                          <LogIn className="w-4 h-4 text-[#183b2b]" />
                          Partner Sign-In
                        </button>
                        <a
                          href="#contact"
                          onClick={() => setIsProfileOpen(false)}
                          className="profile-menu-item w-full text-left flex items-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4 text-[#183b2b]" />
                          Talk to us <span>↗</span>
                        </a>
                        <div className="profile-dropdown-divider"></div>
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            navigateTo('/admin/login');
                          }}
                          className="profile-menu-item w-full text-left text-xs font-mono text-[#55705c] flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#79966e]" />
                          Admin Portal Login
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header Sub Container: Full-Width Delivery Card + Full-Width Search Bar (<= 768px / md:hidden) */}
        <div className="mobile-header-sub md:hidden">
          {/* Full-width delivery location card */}
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="mobile-delivery-card"
            aria-label="Select delivery location"
          >
            <div className="mobile-delivery-left">
              <div className="mobile-delivery-icon">
                <MapPin className="w-4 h-4 text-[#183b2b]" />
              </div>
              <div className="mobile-delivery-text">
                <div className="mobile-delivery-title">
                  <span>Delivery tomorrow</span>
                  <span className="mobile-delivery-tag">6 AM Slot</span>
                </div>
                <div className="mobile-delivery-sub">
                  {selectedLocation?.label || 'Select delivery location'}
                </div>
              </div>
            </div>
            <div className="mobile-delivery-arrow">
              <ChevronDown className="w-4 h-4 text-[#183b2b]" />
            </div>
          </button>

          {/* Full-width search bar (48–52px tall) */}
          <div className="mobile-search-bar">
            <Search className="w-4 h-4 text-[#55705c] shrink-0" />
            <input
              type="text"
              placeholder="Search produce, categories or farms"
              value={searchQuery}
              onChange={(e) => handleHeaderSearch(e.target.value)}
              className="mobile-search-input"
              aria-label="Search produce, categories or farms"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="clear-search-btn"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer & Backdrop Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 xl:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              id="mobile-navigation"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-[#f4f0e7] z-50 p-6 flex flex-col justify-between shadow-2xl border-l border-[#183b2b]/20 xl:hidden overflow-y-auto"
              role="navigation"
              aria-label="Mobile Navigation"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#183b2b]/15">
                  <a 
                    className="wordmark" 
                    href="/" 
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>THE SOIL</span>
                    <strong>THEORY</strong>
                    <i></i>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#183b2b]/10 text-[#183b2b] hover:bg-[#183b2b]/20 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <a
                    href="#why"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 text-[#183b2b] font-medium text-base rounded-xl hover:bg-[#183b2b]/10 transition-colors min-h-[44px] flex items-center"
                  >
                    Why Soil Theory
                  </a>
                  <a
                    href="#sourcing"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 text-[#183b2b] font-medium text-base rounded-xl hover:bg-[#183b2b]/10 transition-colors min-h-[44px] flex items-center"
                  >
                    How it works
                  </a>
                  <a
                    href="#faq"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 text-[#183b2b] font-medium text-base rounded-xl hover:bg-[#183b2b]/10 transition-colors min-h-[44px] flex items-center"
                  >
                    FAQ
                  </a>
                </div>
              </div>

              <div className="pt-6 border-t border-[#183b2b]/15 flex flex-col gap-3">
                <a
                  href="#contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full bg-[#183b2b] text-[#f4f0e7] font-semibold text-center py-3.5 px-5 rounded-xl text-sm transition-all hover:bg-[#25543e] active:scale-[0.98] min-h-[44px] flex items-center justify-center gap-2 shadow-sm"
                >
                  Talk to us <span>↗</span>
                </a>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <main id="top" className="w-full max-w-full overflow-x-hidden">
        {/* 3. Moving Banners & Category Circles Section */}
        <section className="moving-banners-section" id="produce">
          <div className="moving-banners-header">
            <div className="header-left-title">
              <h2 className="chef-heading">
                Chef Approved Freshness<br />Directly From Our Farm
              </h2>
            </div>
            
            {/* Category Circles Row */}
            <div className="header-right-categories">
              {categoryCards.map((cat) => (
                <a
                  key={cat.id}
                  href={`/produce/category/${cat.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setSelectedCategory(cat.name);
                    setActiveTab('catalog');
                    const el = document.getElementById('catalog-workspace');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="category-circle-item"
                >
                  <div className={`circle-img-wrapper ${cat.bgClass} ${selectedCategory === cat.name ? 'ring-2 ring-[#183b2b]' : ''}`}>
                    <img
                      src={cat.image}
                      alt={cat.name}
                      width={256}
                      height={256}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                      style={{ objectFit: 'cover', objectPosition: 'center', width: '100%', height: '100%' }}
                    />
                  </div>
                  <span className={`circle-label ${selectedCategory === cat.name ? 'underline font-bold' : ''}`}>
                    {cat.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Banner Carousel */}
          <div 
            ref={viewportRef}
            className="moving-banners-container"
            style={bannerCardWidth > 0 ? {
              aspectRatio: 'auto',
              height: `${bannerViewportHeight}px`,
              visibility: isMobile && !isMobileBannerReady ? 'hidden' : 'visible'
            } : isMobile ? { visibility: 'hidden' } : undefined}
            tabIndex={0}
            role="region"
            aria-label="Promotional Banners Carousel"
            onKeyDown={handleKeyDown}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div className="moving-banners-viewport">
              <div
                className={`moving-banners-track ${isDragging ? 'is-dragging' : ''}`}
                style={{
                  transform: isMobile && bannerSlideWidth > 0
                    ? `translate3d(${-(bannerIndex * (bannerSlideWidth + 24)) + dragOffset}px, 0, 0)`
                    : `translateX(calc(-1 * ${bannerIndex} * ((100cqw + 24px) / 2) + ${dragOffset}px))`,
                  transition: isDragging || !isTransitioning || (isMobile && !isMobileBannerReady)
                    ? 'none'
                    : 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
                }}
                onTransitionEnd={handleBannerTransitionEnd}
              >
                {loopedBannerItems.map((item, slideIndex) => {
                  const shouldLoadImage =
                    slideIndex >= bannerIndex - 1 &&
                    slideIndex <= bannerIndex + visibleBannerCount;
                  const isPrimaryImage = slideIndex === bannerItems.length;

                  return (
                    <div
                      key={`banner-${slideIndex}`}
                      className="moving-banner-item"
                      style={isMobile && bannerSlideWidth > 0 ? {
                        flex: `0 0 ${bannerSlideWidth}px`,
                        width: `${bannerSlideWidth}px`,
                        minWidth: `${bannerSlideWidth}px`
                      } : undefined}
                    >
                      {shouldLoadImage && (
                        <img
                          src={item.image}
                          alt={item.alt}
                          width={2400}
                          height={1500}
                          loading={isPrimaryImage ? 'eager' : 'lazy'}
                          fetchPriority={isPrimaryImage ? 'high' : 'auto'}
                          decoding="async"
                          draggable="false"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Hero Section */}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">For restaurants that care what they serve</p>
            <h1>Produce your<br /><i>guests can trust.</i></h1>
            <p className="hero-description">
              Chemical-free, traceable produce from Karnataka's best farms — delivered fresh to your kitchen before 6 AM.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="#contact">Start sourcing better <span>→</span></a>
              <a className="text-link" href="#sourcing">See how it works <span>↓</span></a>
            </div>
            <div className="hero-proof">
              <div><strong>1,500+</strong><span>Karnataka farmers</span></div>
              <div><strong>Weekly</strong><span>lab residue tests</span></div>
              <div><strong>6 AM</strong><span>kitchen delivery</span></div>
            </div>
          </div>

          {/* Hero SVG Art */}
          <div className="hero-art">
            <svg viewBox="0 0 600 720" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
              <rect width="600" height="720" fill="#dfd4c3" />
              <path d="M 0 420 L 251 420 L 251 660 L 600 660 L 600 720 L 0 720 Z" fill="#bd5c38" />
              <path d="M 250 270 Q 250 130 390 130 L 600 130 L 600 660 L 250 660 Z" fill="#1d4838" />
              <text x="32" y="44" fontFamily="'DM Mono', monospace" fontSize="12" fontWeight="600" fill="#1d4838" letterSpacing="1.8">ROOTED IN CARE</text>
              <text x="32" y="64" fontFamily="'DM Mono', monospace" fontSize="12" fontWeight="600" fill="#1d4838" letterSpacing="1.8">MADE FOR GROWTH</text>
              <g transform="translate(283, 270) rotate(-22)">
                <path d="M 0,-95 C 48,-45 48,45 0,95 C -48,45 -48,-45 0,-95 Z" fill="#f0e8d9" />
              </g>
              <g transform="translate(428, 355) rotate(-52)">
                <path d="M 0,-110 C 52,-50 52,50 0,110 C -52,50 -52,-50 0,-110 Z" fill="#f0e8d9" />
              </g>
              <g transform="translate(222, 510) rotate(-22)">
                <path d="M 0,-115 C 55,-55 55,55 0,115 C -55,55 -55,-55 0,-115 Z" fill="#f0e8d9" />
              </g>
              <text x="568" y="688" textAnchor="end" fontFamily="'DM Mono', monospace" fontSize="12" fontWeight="600" fill="#f0e8d9" letterSpacing="1.8">THE SOIL THEORY</text>
              <text x="568" y="708" textAnchor="end" fontFamily="'DM Mono', monospace" fontSize="12" fontWeight="600" fill="#f0e8d9" letterSpacing="1.8">EST. WITH INTENTION</text>
              <rect x="18" y="18" width="564" height="684" fill="none" stroke="rgba(29, 72, 56, 0.15)" strokeWidth="1" />
            </svg>
          </div>
        </section>

        {/* 5. Statement Section */}
        <section className="statement" id="why">
          <p className="eyebrow">The kitchen standard</p>
          <h2>Your menu says <i>fresh.</i><br />Your sourcing should say <i>safe.</i></h2>
          <p>
            Restaurants shouldn't have to choose between a reliable supply, a fair price, and food they are proud to serve. Soil Theory is the bridge between those promises.
          </p>
        </section>

        {/* 6. Problem Grid Section */}
        <section className="problem-grid">
          <article>
            <span className="number">01</span>
            <h3>Know the farm.</h3>
            <p>Every product comes with a clear origin story. No vague market sourcing, no guessing.</p>
          </article>
          <article>
            <span className="number">02</span>
            <h3>Know what's on it.</h3>
            <p>We test for pesticide residue every week and share the reports with our partners.</p>
          </article>
          <article>
            <span className="number">03</span>
            <h3>Know it will arrive.</h3>
            <p>One dependable supplier, a broad range, and a delivery window built around your prep.</p>
          </article>
        </section>

        {/* 7. Process Timeline Section */}
        <section className="process" id="sourcing">
          <div className="process-intro">
            <p className="eyebrow">From farm to pass</p>
            <h2>Picked after you order.<br /><i>Ready before you prep.</i></h2>
            <p>We coordinate harvest, quality control, testing and delivery so your team can focus on the food.</p>
          </div>
          <ol className="timeline">
            <div className="timeline-truck-container">
              <svg className="timeline-truck" viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="40" cy="38" rx="34" ry="1.5" fill="rgba(24, 59, 43, 0.22)" />
                <g className="timeline-truck-body">
                  <rect x="6" y="27" width="67" height="3" rx="1.5" fill="var(--ink)" />
                  <path d="M 48,11 H 63 C 65.5,11 67.5,13 69.5,16 L 73.5,22 C 74.5,23.5 74.5,24.5 74.5,26 V 29 H 48 Z" fill="var(--lime)" />
                  <path d="M 51,13 H 61.5 L 65.5,19 H 51 Z" fill="var(--ink)" />
                  <rect x="4" y="6" width="44" height="22" rx="2.5" fill="var(--paper)" />
                  <line x1="6" y1="6" x2="6" y2="28" stroke="var(--ink)" strokeWidth="1" />
                  <g transform="translate(1, 0)">
                    <path d="M 24,17 Q 20,13 17,15 Q 19,20 24,17 Z" fill="var(--moss)" />
                    <path d="M 24,17 Q 28,12 32,13 Q 30,19 24,17 Z" fill="var(--lime)" />
                    <path d="M 24,17 L 26,21" stroke="var(--ink)" strokeWidth="1.2" strokeLinecap="round" />
                  </g>
                  <circle cx="73" cy="23" r="1.5" fill="#ffffff" />
                  <line x1="74.5" y1="26" x2="72" y2="26" stroke="var(--ink)" strokeWidth="1" />
                </g>
                <g className="truck-wheel">
                  <circle cx="18" cy="31" r="6.5" fill="var(--ink)" />
                  <circle cx="18" cy="31" r="3.5" fill="var(--paper)" />
                  <path d="M 14.5,31 H 21.5 M 18,27.5 V 34.5" stroke="var(--ink)" strokeWidth="1" />
                </g>
                <g className="truck-wheel">
                  <circle cx="58" cy="31" r="6.5" fill="var(--ink)" />
                  <circle cx="58" cy="31" r="3.5" fill="var(--paper)" />
                  <path d="M 54.5,31 H 61.5 M 58,27.5 V 34.5" stroke="var(--ink)" strokeWidth="1" />
                </g>
              </svg>
            </div>
            <li><span>12 PM</span><strong>You order</strong><small>App or WhatsApp</small></li>
            <li><span>3 PM</span><strong>Farmers notified</strong><small>Harvest prepared</small></li>
            <li><span>9 PM</span><strong>QC & grading</strong><small>At our FPO hub</small></li>
            <li><span>6 AM</span><strong>On your counter</strong><small>Fresh and ready</small></li>
          </ol>
        </section>

        {/* 8. Interactive Produce Catalog & Workspace Area */}
        <section id="catalog-workspace" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 box-border overflow-hidden">
          <CataloguePersonalization
            preferences={cataloguePreferences}
            isAuthenticated={Boolean(auth.currentUser)}
            isLoading={personalizationLoading}
            isSaving={personalizationSaving}
            error={personalizationError}
            onSignIn={handleLogin}
            onSave={handleSaveCataloguePreferences}
            onDisable={handleDisableCataloguePreferences}
          />
          
          {/* Workspace Tabs Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#183b2b]/20 mb-8 w-full max-w-full min-w-0">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'catalog' ? 'bg-[#183b2b] text-[#c9dc74] shadow-md' : 'bg-white/60 text-[#183b2b] hover:bg-white'
                }`}
              >
                <Sprout className="w-4 h-4 inline-block mr-2" />
                Produce Catalog
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'reports' ? 'bg-[#183b2b] text-[#c9dc74] shadow-md' : 'bg-white/60 text-[#183b2b] hover:bg-white'
                }`}
              >
                <FileText className="w-4 h-4 inline-block mr-2" />
                Lab Certifications
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('estimator')}
                className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'estimator' ? 'bg-[#183b2b] text-[#c9dc74] shadow-md' : 'bg-white/60 text-[#183b2b] hover:bg-white'
                }`}
              >
                <Calculator className="w-4 h-4 inline-block mr-2" />
                Supply Cost Estimator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inquiries')}
                className={`px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'inquiries' ? 'bg-[#183b2b] text-[#c9dc74] shadow-md' : 'bg-white/60 text-[#183b2b] hover:bg-white'
                }`}
              >
                <ClipboardList className="w-4 h-4 inline-block mr-2" />
                Inquiries & Logistics
                {myInquiries.length > 0 && (
                  <span className="ml-2 bg-[#f48b4d] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {myInquiries.length}
                  </span>
                )}
              </button>
            </div>

            {/* Catalog Search Bar */}
            {activeTab === 'catalog' && (
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#79966e] absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search produce or farm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#183b2b]/20 text-[#183b2b] pl-9 pr-8 py-2 text-xs focus:outline-none focus:border-[#183b2b]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#79966e] hover:text-[#183b2b] font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            
            {/* View 1: Produce Catalog */}
            {activeTab === 'catalog' && (
              <motion.div
                key="catalog-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full max-w-full min-w-0">
                  {['All Products', 'Vegetables', 'Fruits', 'Leafy Greens', 'Microgreens', 'Mushrooms', 'Exotics'].map((catName) => (
                    <a
                      key={catName}
                      href={
                        catName === 'All Products'
                          ? '#catalog-workspace'
                          : `/produce/category/${catName.toLowerCase().replace(/\s+/g, '-')}`
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        setSelectedCategory(catName);
                      }}
                      className={`px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === catName
                          ? 'bg-[#183b2b] text-[#c9dc74]'
                          : 'bg-white border border-[#e9e3d5] text-[#183b2b] hover:bg-[#e9e3d5]/50'
                      }`}
                    >
                      {catName}
                    </a>
                  ))}
                  {selectedCategory !== 'All Products' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All Products')}
                      className="text-xs text-[#f48b4d] underline font-mono hover:text-[#183b2b] ml-2 whitespace-nowrap cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                {/* Products Loading / Error / Grid State */}
                {(() => {
                  if (productsLoading) {
                    return (
                      <div className="bg-white border border-[#e9e3d5] p-12 text-center space-y-3">
                        <Loader2 className="w-8 h-8 text-[#79966e] animate-spin mx-auto" />
                        <p className="text-sm text-[#79966e] font-mono">
                          Loading fresh harvest catalog from Firestore "products" collection...
                        </p>
                      </div>
                    );
                  }

                  if (productsError) {
                    return (
                      <div className="bg-red-50 border border-red-200 text-red-900 p-6 space-y-3">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                          <span>Unable to load produce catalog from database</span>
                        </div>
                        <p className="text-xs font-mono">{productsError}</p>
                        <button
                          type="button"
                          onClick={() => loadProductsFromFirestore()}
                          className="text-xs bg-red-900 text-white px-4 py-2 font-semibold hover:bg-black transition-all cursor-pointer"
                        >
                          Retry Loading Catalog
                        </button>
                      </div>
                    );
                  }

                  const activeProducts = products.filter(prod => {
                    const activeState = prod.isActive ?? (prod as any).active ?? true;
                    return activeState !== false;
                  });

                  const filteredProducts = activeProducts.filter(prod => {
                    const catLower = selectedCategory.toLowerCase().trim();
                    let matchesCategory = true;
                    if (catLower !== 'all products' && catLower !== 'shop all' && catLower !== 'all') {
                      const prodCat = (prod.category || '').toLowerCase().trim();
                      if (catLower === 'vegetables') {
                        matchesCategory = prodCat.includes('veg');
                      } else if (catLower === 'fruits') {
                        matchesCategory = prodCat.includes('fruit');
                      } else if (catLower === 'leafy greens') {
                        matchesCategory = prodCat.includes('leaf') || prodCat.includes('green') || prodCat.includes('herb') || prodCat.includes('spinach') || prodCat.includes('lettuce');
                      } else if (catLower === 'microgreens') {
                        matchesCategory = prodCat.includes('micro') || prodCat.includes('sprout');
                      } else if (catLower === 'mushrooms') {
                        matchesCategory = prodCat.includes('mushroom') || prodCat.includes('fungi');
                      } else if (catLower === 'exotics') {
                        matchesCategory = prodCat.includes('exotic') || prodCat.includes('specialty');
                      } else {
                        matchesCategory = prodCat.includes(catLower) || catLower.includes(prodCat);
                      }
                    }

                    const queryLower = searchQuery.toLowerCase().trim();
                    const farmSource = getProductFarmSource(prod);
                    const matchesSearch = !queryLower || 
                      (prod.name && prod.name.toLowerCase().includes(queryLower)) ||
                      (prod.description && prod.description.toLowerCase().includes(queryLower)) ||
                      (prod.shortIntro && prod.shortIntro.toLowerCase().includes(queryLower)) ||
                      (prod.category && prod.category.toLowerCase().includes(queryLower)) ||
                      farmSource.toLowerCase().includes(queryLower);

                    return matchesCategory && matchesSearch;
                  });

                  const rankedProducts = rankCatalogueProducts(
                    filteredProducts,
                    cataloguePreferences
                  );

                  if (rankedProducts.length === 0) {
                    return (
                      <div className="bg-white border border-[#e9e3d5] p-12 text-center space-y-3">
                        <Sprout className="w-8 h-8 text-[#79966e]/50 mx-auto" />
                        <p className="text-sm text-[#79966e] font-medium">
                          No produce found for "{selectedCategory}" {searchQuery ? `matching "${searchQuery}"` : ''}.
                        </p>
                        <button
                          type="button"
                          onClick={() => { setSelectedCategory('All Products'); setSearchQuery(''); }}
                          className="text-xs bg-[#183b2b] text-[#f4f0e7] px-4 py-2 font-semibold hover:bg-[#79966e] transition-all cursor-pointer"
                        >
                          View All Harvest
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rankedProducts.map((prod) => {
                        const priceRange = getProductPriceRange(prod);
                        const farmSource = getProductFarmSource(prod);
                        const weeklyStatus = getProductWeeklyTestStatus(prod);
                        const description = getProductDescription(prod);
                        const currentQty = estimateQuantities[prod.id] || 0;

                        return (
                          <ProductCard
                            key={prod.id}
                            product={prod}
                            productHref={`/produce/${encodeURIComponent(prod.slug)}`}
                            priceRange={priceRange}
                            farmSource={farmSource}
                            weeklyStatus={weeklyStatus}
                            description={description}
                            currentQuantity={currentQty}
                            onOpen={() => {
                              navigateTo(`/produce/${encodeURIComponent(prod.slug)}`);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            onAdd={() => {
                              setEstimateQuantities((current) => ({
                                ...current,
                                [prod.id]: (current[prod.id] || 0) + 10,
                              }));
                              setIsCartOpen(true);
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* View 2: Lab Certifications */}
            {activeTab === 'reports' && (
              <motion.div
                key="reports-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-white border border-[#e9e3d5] p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#e9e3d5] pb-4">
                    <div>
                      <h3 className="font-serif text-2xl font-bold text-[#183b2b]">Weekly Toxicology & Residue Certifications</h3>
                      <p className="text-xs text-[#55705c] mt-1">
                        Independent SGS & FSSAI accredited laboratory reports conducted weekly across all Karnataka partner farms.
                      </p>
                    </div>
                    <span className="bg-[#c9dc74] text-[#183b2b] font-mono text-xs font-bold px-3 py-1 uppercase tracking-wider">
                      Zero Residue Guarantee
                    </span>
                  </div>

                  <div className="divide-y divide-[#e9e3d5]">
                    {reports.map((rep) => (
                      <div key={rep.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-[#f48b4d] font-bold">{rep.id}</span>
                            <span className="text-[10px] font-mono text-[#55705c] bg-[#f4f0e7] px-2 py-0.5">
                              Batch: {rep.batchId}
                            </span>
                          </div>
                          <h4 className="font-serif text-lg font-bold text-[#183b2b]">{rep.result}</h4>
                          <p className="text-xs text-[#55705c]">Tested on {rep.testDate} at {rep.labName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[#3e6927] flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {rep.status}
                          </span>
                          <a 
                            href={rep.downloadUrl}
                            onClick={(e) => { e.preventDefault(); alert(`Downloading PDF Verification Report for Batch: ${rep.batchId}`); }}
                            className="button button-dark text-xs px-3 py-1.5"
                          >
                            Download PDF Report
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* View 3: Supply Cost Estimator */}
            {activeTab === 'estimator' && (
              <motion.div
                key="estimator-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-white border border-[#e9e3d5] p-6 space-y-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-[#183b2b]">Smart Supply Cost Estimator</h3>
                    <p className="text-xs text-[#55705c] mt-1">
                      Adjust your expected weekly volumes to see volume discount pricing and dynamic totals.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-[#f4f0e7] border border-[#e9e3d5]">
                      <span className="text-[10px] font-mono uppercase text-[#55705c]">Standard Tier</span>
                      <strong className="block font-serif text-lg text-[#183b2b] mt-1">&lt; 20 kg/week</strong>
                      <span className="text-xs text-[#55705c]">Base Rate</span>
                    </div>
                    <div className="p-4 bg-[#c9dc74]/20 border border-[#c9dc74]">
                      <span className="text-[10px] font-mono uppercase text-[#3e6927] font-bold">Mid Volume Tier</span>
                      <strong className="block font-serif text-lg text-[#183b2b] mt-1">&gt;= 20 kg/week</strong>
                      <span className="text-xs text-[#3e6927] font-bold">5% Volume Discount</span>
                    </div>
                    <div className="p-4 bg-[#183b2b] text-[#f4f0e7]">
                      <span className="text-[10px] font-mono uppercase text-[#c9dc74]">High Volume Tier</span>
                      <strong className="block font-serif text-lg text-[#c9dc74] mt-1">&gt;= 50 kg/week</strong>
                      <span className="text-xs text-[#e9e3d5]">10% Volume Discount</span>
                    </div>
                  </div>

                  {/* Quantity adjustment list */}
                  <div className="divide-y divide-[#e9e3d5] border-t border-b border-[#e9e3d5]">
                    {products.slice(0, 8).map((prod) => {
                      const qty = estimateQuantities[prod.id] || 0;
                      return (
                        <div key={prod.id} className="py-3 flex justify-between items-center gap-4">
                          <div>
                            <h4 className="font-serif font-bold text-sm text-[#183b2b]">{prod.name}</h4>
                            <span className="text-xs text-[#55705c]">{getProductPriceRange(prod)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="0"
                              max="1000"
                              value={qty || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setEstimateQuantities(prev => ({ ...prev, [prod.id]: val }));
                              }}
                              placeholder="0"
                              className="w-20 border border-[#e9e3d5] px-2 py-1 text-xs font-mono text-center focus:outline-none focus:border-[#183b2b]"
                            />
                            <span className="text-xs font-bold text-[#183b2b]">kg</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-[#183b2b] text-[#f4f0e7] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-xs font-mono text-[#c9dc74] uppercase">ESTIMATED WEEKLY COST</span>
                      <strong className="block font-serif text-3xl text-white">₹{getEstimatedTotal().toLocaleString('en-IN')}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('inquiries');
                        const el = document.getElementById('contact');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="button button-light font-bold text-xs px-6 py-3"
                    >
                      Proceed to Official Inquiry <span>→</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* View 4: Inquiries & Logistics Portal */}
            {activeTab === 'inquiries' && (
              <motion.div
                key="inquiries-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Submission Form */}
                  <div className="lg:col-span-7 bg-white border border-[#e9e3d5] p-6 space-y-4">
                    <h3 className="font-serif text-xl font-bold text-[#183b2b] border-b border-[#e9e3d5] pb-3">
                      Submit Restaurant Onboarding Inquiry
                    </h3>

                    {inquirySuccess && (
                      <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Inquiry submitted successfully! Our Bengaluru logistics officer will reach out shortly.</span>
                      </div>
                    )}

                    {deliveryServiceStatus === 'unsupported' && (
                      <div
                        className="flex items-center gap-2 border border-[#f48b4d]/40 bg-[#f48b4d]/10 p-4 text-xs font-semibold text-[#9a4d2f]"
                        role="status"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        We're expanding to your area soon.
                      </div>
                    )}

                    <form onSubmit={handleSubmitInquiry} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono font-bold uppercase text-[#183b2b] mb-1">RESTAURANT / CAFE NAME</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. Olive Bar & Kitchen, Indiranagar"
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          className="w-full bg-[#f4f0e7]/50 border border-[#e9e3d5] px-3 py-2 text-xs focus:outline-none focus:border-[#183b2b]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono font-bold uppercase text-[#183b2b] mb-1">DIRECT CONTACT PHONE</label>
                        <input 
                          type="tel"
                          required
                          placeholder="e.g. +91 98805 85292"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          className="w-full bg-[#f4f0e7]/50 border border-[#e9e3d5] px-3 py-2 text-xs focus:outline-none focus:border-[#183b2b]"
                        />
                      </div>

                      <div className="bg-[#f4f0e7] p-3 text-xs space-y-1">
                        <span className="font-mono font-bold text-[#55705c]">SELECTED INQUIRY SUMMARY:</span>
                        <p className="font-mono text-[#183b2b]">
                          {cartItemCount > 0 ? `${cartItemCount} items selected in cart` : `Daily Requirement: ~${dailyRequirementKg} kg/day`}
                        </p>
                        <p className="font-bold text-[#183b2b]">Estimated Cost: ₹{getEstimatedTotal().toLocaleString('en-IN')}</p>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          submittingInquiry ||
                          deliveryServiceStatus === 'unsupported'
                        }
                        className="button button-dark w-full text-xs font-bold py-3 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {submittingInquiry ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#c9dc74]" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-[#c9dc74]" />
                            Submit Official Supply Request
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Logistics History */}
                  <div className="lg:col-span-5 bg-white border border-[#e9e3d5] p-6 space-y-4">
                    <h3 className="font-serif text-xl font-bold text-[#183b2b] border-b border-[#e9e3d5] pb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#79966e]" />
                      Logistics History
                    </h3>

                    {!user ? (
                      <div className="text-center py-6 space-y-3">
                        <p className="text-xs text-[#55705c]">Sign in with Google to view your restaurant's active supply requests and logistics timeline.</p>
                        <button type="button" onClick={handleLogin} className="button button-dark text-xs px-4 py-2">
                          Sign In with Google
                        </button>
                      </div>
                    ) : myInquiries.length === 0 ? (
                      <p className="text-xs text-[#55705c] italic text-center py-6">No previous inquiries found for this account.</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {myInquiries.map((inq) => (
                          <div key={inq.id} className="p-3 border border-[#e9e3d5] bg-[#f4f0e7]/30 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-mono font-bold text-[#183b2b]">{inq.restaurantName}</span>
                              <span className="font-mono text-[10px] bg-[#c9dc74] text-[#183b2b] px-1.5 py-0.5 font-bold uppercase">
                                {inq.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#55705c] font-mono">{inq.items}</p>
                            <div className="flex justify-between items-center text-[10px] text-[#55705c] pt-1">
                              <span>{new Date(inq.createdAt).toLocaleDateString('en-IN')}</span>
                              <strong className="text-[#183b2b]">₹{parseInt(inq.estimatedCost).toLocaleString('en-IN')}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

        {/* 9. Report / Lab Testing Section */}
        <section className="report-section">
          <div className="report-copy">
            <p className="eyebrow">Proof, not promises</p>
            <h2>Lab-tested weekly.<br /><i>Guaranteed safe.</i></h2>
            <p>
              We conduct pesticide-residue testing every week. If a batch fails, it never ships. We share the report, because trust should be visible.
            </p>
            <div className="guarantee">
              <span>↻</span>
              <p><strong>Our QA policy</strong><br />If a vegetable disappoints you, we replace it. Free. No forms.</p>
            </div>
          </div>
          <div className="report-card" aria-label="Example weekly pesticide report">
            <div className="report-top">
              <span className="report-wordmark">THE SOIL <b>THEORY</b></span>
              <span>WEEKLY REPORT</span>
            </div>
            <h3>Residue test report</h3>
            <p className="report-meta">REPORT ID: ST-2026-W28 &nbsp;•&nbsp; JULY 10, 2026</p>
            <div className="report-row"><span>Sample type</span><b>Mixed produce</b></div>
            <div className="report-row"><span>Organophosphates</span><b>Not detected</b></div>
            <div className="report-row"><span>Carbamates</span><b>Not detected</b></div>
            <div className="report-row"><span>Pyrethroids</span><b>Not detected</b></div>
            <div className="report-result"><span>Overall result</span><strong>Passed <i>✓</i></strong></div>
          </div>
        </section>

        {/* 10. Tiers Section */}
        <section className="tiers" id="tiers">
          <div className="tiers-heading">
            <p className="eyebrow">One partner, five tiers</p>
            <h2>The full market,<br /><i>held to one standard.</i></h2>
          </div>
          <div className="tier-list">
            <article>
              <span className="tier-no">01</span>
              <div>
                <h3>Certified organic</h3>
                <p>FSSAI/PGS certified. For menu claims.</p>
              </div>
              <b>₹60–70/kg</b>
            </article>
            <article>
              <span className="tier-no">02</span>
              <div>
                <h3>Organically grown</h3>
                <p>Certification in progress. Same standards.</p>
              </div>
              <b>₹55–60/kg</b>
            </article>
            <article>
              <span className="tier-no">03</span>
              <div>
                <h3>Pesticide-free</h3>
                <p>Controlled sourcing. No synthetic pesticides.</p>
              </div>
              <b>₹45–50/kg</b>
            </article>
            <article>
              <span className="tier-no">04</span>
              <div>
                <h3>Microgreens & specialty</h3>
                <p>Premium ingredients for high-margin menus.</p>
              </div>
              <b>₹150–300/kg</b>
            </article>
            <article>
              <span className="tier-no">05</span>
              <div>
                <h3>Imported exotics</h3>
                <p>Verified safe differentiation items.</p>
              </div>
              <b>On request</b>
            </article>
          </div>
        </section>

        {/* 11. Supply Cost Calculator Section */}
        <section className="calculator">
          <div>
            <p className="eyebrow">A fairer food cost</p>
            <h2>Built for your<br /><i>actual kitchen.</i></h2>
            <p>Get a tailored sample invoice based on your menu and expected volumes.</p>
          </div>
          <form 
            className="estimate-form" 
            id="estimate-form"
            onSubmit={(e) => {
              e.preventDefault();
              setActiveTab('inquiries');
              const el = document.getElementById('contact');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <label>
              Daily produce requirement 
              <output id="kg-output">{dailyRequirementKg} kg</output>
              <input 
                id="kg-input" 
                type="range" 
                min="20" 
                max="300" 
                value={dailyRequirementKg} 
                step="5" 
                onChange={(e) => setDailyRequirementKg(Number(e.target.value))}
              />
            </label>
            <div className="estimate-total">
              <span>Estimated monthly produce</span>
              <strong id="estimate-output">₹{getEstimatedTotal().toLocaleString('en-IN')}</strong>
              <small>Based on ₹68/kg average, excluding delivery</small>
            </div>
            <button type="submit" className="button button-light">
              Request your sample invoice <span>→</span>
            </button>
          </form>
        </section>

        {/* 12. Contact & Inquiry Section */}
        <section className="contact" id="contact">
          <div>
            <p className="eyebrow">Let's talk</p>
            <h2>Your kitchen.<br />Our farmers.<br /><i>One promise:</i><br />chemical-free.</h2>
          </div>
          <div className="contact-details">
            <p>Ready to change what's coming through your kitchen door? Tell us a little about your restaurant.</p>
            <a href="tel:+919880585292">+91 98805 85292 <span>↗</span></a>
            <a href="mailto:hello@soiltheory.in">hello@soiltheory.in <span>↗</span></a>
            <a href="https://www.thesoiltheory.in" target="_blank" rel="noreferrer">thesoiltheory.in <span>↗</span></a>
            <a 
              className="button button-light contact-button" 
              href="https://wa.me/919880585292?text=Hi%20Soil%20Theory%2C%20I%27d%20like%20to%20learn%20more%20about%20sourcing%20produce." 
              target="_blank" 
              rel="noreferrer"
            >
              Message on WhatsApp <span>→</span>
            </a>
          </div>
        </section>

        {/* 13. FAQ Section */}
        <section className="faq-section py-16 px-6 bg-[#f8f7f0] border-t border-[#183b2b]/10" id="faq">
          <div className="max-w-4xl mx-auto">
            <p className="eyebrow mb-2">Common Questions</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#183b2b] mb-8">
              Frequently Asked <i className="italic font-normal">Questions.</i>
            </h2>
            
            <div className="divide-y divide-[#183b2b]/20 border-t border-b border-[#183b2b]/20">
              {faqData.map((faq, idx) => (
                <details key={idx} className="group py-5 transition-all">
                  <summary className="flex justify-between items-center cursor-pointer font-serif font-bold text-lg text-[#183b2b] list-none select-none">
                    <span>{faq.q}</span>
                    <span className="text-xl text-[#79966e] group-open:rotate-45 transition-transform duration-200">
                      +
                    </span>
                  </summary>
                  <p className="text-sm text-[#55705c] leading-relaxed mt-3 max-w-2xl">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 14. Footer & Legal Bar */}
      <footer>
        <a className="wordmark" href="#top" aria-label="Soil Theory home">
          <span>THE SOIL</span>
          <strong>THEORY</strong>
          <i></i>
        </a>
        <span>© 2026 Soil Theory</span>
        <span>Grown with care in Karnataka</span>
      </footer>

      <div className="legal-bar">
        <a href="/about.html">About</a>
        <a href="/faq.html">FAQ</a>
        <a href="/blog.html">Blog</a>
        <a href="/privacy.html">Privacy Policy</a>
        <a href="/terms.html">Terms of Service</a>
        <button
          type="button"
          onClick={() => navigateTo('/admin/login')}
          className="text-[#57705e] underline hover:text-[#183b2b] cursor-pointer"
          id="footer-admin-link"
        >
          Admin Portal
        </button>
      </div>

    </div>
  );
}
