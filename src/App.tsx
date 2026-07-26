import { useState, useEffect, FormEvent } from 'react';
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
  Award,
  TrendingUp,
  MapPin,
  Calendar,
  Phone,
  Sparkles,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';

// Watercolor banner images
import carrotsImg from './assets/images/1.jpg';
import orangesImg from './assets/images/2.jpg';
import spinachImg from './assets/images/3.jpg';
import microgreensImg from './assets/images/4.jpg';
import tomatoesImg from './assets/images/5.jpg';

interface Product {
  id: string;
  name: string;
  category: string;
  priceRange: string;
  farmSource: string;
  weeklyTestStatus: string;
  image: string;
  description: string;
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
  {
    image: carrotsImg,
    title: "Organic Nantes Carrots",
    source: "Hoskote Biodynamic Farm",
    desc: "Sweet, soil-grown heirloom carrots harvested at dawn.",
    color: "bg-[#fdfbf7]", // Warm cream
    tag: "100% Organic"
  },
  {
    image: orangesImg,
    title: "Valencia Field Oranges",
    source: "Devarayandurga Orchard",
    desc: "Sun-ripened citrus, high brix level, zero wax coatings.",
    color: "bg-[#f4f7f2]", // Light sage green
    tag: "Wax-Free"
  },
  {
    image: spinachImg,
    title: "Heirloom English Spinach",
    source: "Kanvapura Regenerative Farm",
    desc: "Thick, mineral-rich dark leaves grown with compost.",
    color: "bg-[#f4f7f2]", // Light sage green
    tag: "Hydro-Washed"
  },
  {
    image: microgreensImg,
    title: "Rainbow Micro-Sprouts",
    source: "Indiranagar Urban Canopy",
    desc: "Superfood microgreens packed with intense nutrients.",
    color: "bg-[#f4f7f2]", // Light sage green
    tag: "Harvested Daily"
  },
  {
    image: tomatoesImg,
    title: "Vined Cherry Tomatoes",
    source: "Kengeri Greenhouse Soil",
    desc: "Acid-balanced, intensely sweet tomatoes on vine.",
    color: "bg-[#fdfbf7]", // Warm cream
    tag: "Residue-Free"
  }
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [activeTab, setActiveTab] = useState<'catalog' | 'reports' | 'estimator' | 'inquiries'>('catalog');
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [myInquiries, setMyInquiries] = useState<Inquiry[]>([]);
  
  // Estimator State
  const [estimateQuantities, setEstimateQuantities] = useState<Record<string, number>>({});
  
  // Inquiry Form State
  const [restaurantName, setRestaurantName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  
  // Slide state for premium interactive showcase banner
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % bannerItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
        const data = await res.json();
        setMyInquiries(data);
      }
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    }
  };

  // Handle Login
  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      setLoading(false);
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

  // Load Initial Data
  useEffect(() => {
    // 1. Fetch static products and reports
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Error fetching products:', err));

    fetch('/api/reports')
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(err => console.error('Error fetching reports:', err));

    // 2. Listen to Auth State
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserSession(currentUser);
        await fetchMyInquiries(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate dynamic weekly estimate
  const getEstimatedTotal = () => {
    let total = 0;
    products.forEach((prod) => {
      const qty = estimateQuantities[prod.id] || 0;
      if (qty > 0) {
        // Parse a standard baseline price from priceRange (e.g. "₹90 - ₹110 / kg" -> base ₹95)
        let price = 100;
        if (prod.id === 'p1') price = 95;
        if (prod.id === 'p2') price = 45;
        if (prod.id === 'p3') price = 70;
        if (prod.id === 'p4') price = 190;
        if (prod.id === 'p5') price = 130;
        if (prod.id === 'p6') price = 50;

        // Apply volume discount: quantities over 50kg get a 10% discount
        if (qty >= 50) {
          price = price * 0.9;
        } else if (qty >= 20) {
          price = price * 0.95;
        }

        total += price * qty;
      }
    });
    return Math.round(total);
  };

  // Submit Inquiry Form
  const handleSubmitInquiry = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmittingInquiry(true);
    try {
      const token = await user.getIdToken();
      
      // Prepare items list
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
          items: itemsList.length > 0 ? itemsList.join(', ') : 'General Restaurant Onboarding Inquiry',
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

  const normalizedPath = currentPath;

  if (normalizedPath === '/admin/login') {
    return <AdminLogin onNavigate={navigateTo} />;
  }

  if (normalizedPath === '/admin') {
    return <AdminDashboard user={user} authLoading={loading} onNavigate={navigateTo} />;
  }

  return (
    <div className="min-h-screen bg-brand-paper flex flex-col font-sans selection:bg-brand-lime selection:text-brand-ink">
      
      {/* Top Banner Announcement */}
      <div className="bg-brand-ink text-white text-xs py-2 px-6 font-mono tracking-wider flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 bg-brand-lime rounded-full animate-pulse"></span>
        WEEKLY TOXICOLOGY & PESTICIDE LAB REPORTS UPDATED • JULY 2026
      </div>

      {/* Temporary Open Admin Login Button directly below top announcement bar */}
      <div className="bg-emerald-800 text-white p-4 text-center border-b-2 border-emerald-950 shadow-md">
        <button
          type="button"
          onClick={() => setCurrentPath('/admin/login')}
          className="bg-brand-lime text-brand-ink hover:bg-white text-lg font-black px-8 py-3.5 rounded-md shadow-xl cursor-pointer tracking-wider uppercase transition-all transform hover:scale-105 inline-flex items-center justify-center gap-2"
          id="open-admin-login-main-btn"
        >
          <Lock className="w-5 h-5" />
          OPEN ADMIN LOGIN
        </button>
      </div>

      {/* Main Elegant Header */}
      <header className="border-b border-brand-cream/60 py-5 px-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sprout className="w-8 h-8 text-brand-moss" />
          <a href="/" className="font-serif text-2xl font-bold tracking-tight text-brand-ink">
            The Soil Theory <strong className="text-brand-moss italic font-normal">in Bengaluru</strong>
          </a>
        </div>

        {/* Auth / Partner Portal Control */}
        <div className="flex items-center gap-4">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-moss" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold font-mono text-brand-moss">RESTAURANT PARTNER</span>
                <span className="text-sm font-medium text-brand-ink">{user.displayName}</span>
              </div>
              {user.photoURL && (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Avatar'} 
                  className="w-9 h-9 rounded-full border border-brand-moss"
                  referrerPolicy="no-referrer"
                />
              )}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-ink/20 hover:border-brand-ink hover:bg-brand-ink/5 text-xs font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 bg-brand-ink text-brand-paper px-4 py-2 hover:bg-brand-moss transition-all text-sm font-semibold rounded-none shadow-md shadow-brand-ink/10"
            >
              <LogIn className="w-4 h-4 text-brand-lime" />
              Partner Sign-In
            </button>
          )}
        </div>
      </header>

      {/* Hero Header Presentation */}
      <section className="bg-gradient-to-b from-brand-paper to-[#ece7db]/20 py-12 px-6 border-b border-brand-cream/35">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left Column: Brand Content */}
          <div className="w-full lg:w-7/12 flex flex-col justify-between">
            <div>
              <span className="text-xs tracking-widest font-mono text-brand-moss font-bold uppercase block mb-3">
                Traceable • Lab-Tested Weekly • Delivered Fresh before 6 AM
              </span>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-brand-ink leading-[1.05] mb-6">
                Chemical-Free Produce for <i className="italic font-normal">Bengaluru's Best</i> Kitchens.
              </h1>
              <p className="text-brand-moss text-base md:text-lg font-medium leading-relaxed max-w-2xl mb-8">
                Partnering directly with Karnataka's regenerative farms to supply leading restaurants and hotels. Certified clean, traceable, and harvested fresh daily.
              </p>
            </div>
            
            {/* Quality Seals Badges */}
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="bg-brand-cream/30 p-4 border border-brand-cream flex items-center gap-3 rounded-none shadow-sm backdrop-blur-xs">
                <Award className="w-10 h-10 text-brand-orange shrink-0" />
                <div>
                  <h4 className="font-serif font-bold text-sm">100% Traceable</h4>
                  <p className="text-xs text-brand-moss">Scan-to-farm transparent logs</p>
                </div>
              </div>
              <div className="bg-brand-cream/30 p-4 border border-brand-cream flex items-center gap-3 rounded-none shadow-sm backdrop-blur-xs">
                <CheckCircle2 className="w-10 h-10 text-brand-moss shrink-0" />
                <div>
                  <h4 className="font-serif font-bold text-sm">Weekly Lab-Tested</h4>
                  <p className="text-xs text-brand-moss">Tested for 148+ pesticides</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Active Interactive Banner Showcase */}
          <div className="w-full lg:w-5/12">
            <div className="relative bg-[#fdfbf7] p-4 md:p-6 border border-brand-cream shadow-xl flex flex-col">
              {/* Artistic Picture Frame Border */}
              <div className="absolute inset-2 border border-brand-cream/40 pointer-events-none z-10"></div>
              
              {/* Slide Image Container with AnimatePresence */}
              <div className="relative h-64 md:h-72 w-full overflow-hidden bg-brand-cream/10 border border-brand-cream/40 mb-4 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center"
                  >
                    <img 
                      src={bannerItems[activeSlide].image} 
                      alt={bannerItems[activeSlide].title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Corner Tag */}
                    <div className="absolute top-3 left-3 bg-brand-ink/95 backdrop-blur-xs text-brand-lime text-[10px] font-mono tracking-widest uppercase py-1 px-2.5 font-semibold z-20 shadow-md">
                      {bannerItems[activeSlide].tag}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slide Content Meta */}
              <div className="min-h-24 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-brand-ink">
                      {bannerItems[activeSlide].title}
                    </h3>
                    <span className="text-[10px] font-mono text-brand-moss font-semibold uppercase flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-brand-orange" />
                      {bannerItems[activeSlide].source}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-brand-moss/90 leading-relaxed font-sans">
                  {bannerItems[activeSlide].desc}
                </p>

                {/* Slider Navigation & Indicators */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-cream/65">
                  <div className="flex gap-2">
                    {bannerItems.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-1.5 transition-all duration-300 ${
                          idx === activeSlide ? 'w-6 bg-brand-moss' : 'w-1.5 bg-brand-cream hover:bg-brand-moss/40'
                        }`}
                        title={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                  
                  <span className="text-[10px] font-mono text-brand-moss font-bold tracking-widest uppercase">
                    SHOWCASE 0{activeSlide + 1} / 0{bannerItems.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Scrolling Premium Quality Ticker Banner */}
      <div className="bg-brand-ink text-brand-paper py-4 border-y border-brand-lime/20 overflow-hidden relative">
        {/* Ambient fade-out gradients on both edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-brand-ink to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-brand-ink to-transparent z-10 pointer-events-none"></div>

        <div className="flex w-max animate-marquee whitespace-nowrap">
          {/* Track 1 */}
          <div className="flex items-center gap-16 px-8">
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <CheckCircle2 className="w-4 h-4 text-brand-lime shrink-0" />
              <span>100% Pesticide-Free Certified</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <Award className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Weekly Toxicology Lab Testing</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <Sparkles className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Harvested Daily at 4:00 AM</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <MapPin className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Traceable to Karnataka Farms</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <Sprout className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Delivered Fresh Before 6:00 AM</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <Award className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Premium Restaurant Grade</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <CheckCircle2 className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Zero Chemical Residues</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
          </div>

          {/* Track 2 (Duplicate for seamless infinite looping transition) */}
          <div className="flex items-center gap-16 px-8">
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <CheckCircle2 className="w-4 h-4 text-brand-lime shrink-0" />
              <span>100% Pesticide-Free Certified</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <Award className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Weekly Toxicology Lab Testing</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <Sparkles className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Harvested Daily at 4:00 AM</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <MapPin className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Traceable to Karnataka Farms</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <Sprout className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Delivered Fresh Before 6:00 AM</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <Award className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Premium Restaurant Grade</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
            <span className="flex items-center gap-3 text-xs font-mono tracking-widest font-bold uppercase">
              <CheckCircle2 className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Zero Chemical Residues</span>
              <span className="text-brand-lime ml-4">•</span>
            </span>
          </div>
        </div>
      </div>

      {/* Infinite Scrolling Watercolor Produce Showcase Banner */}
      <div className="bg-[#f6f3eb] py-8 border-b border-brand-cream/60 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 mb-4">
          <h2 className="text-[10px] font-mono tracking-[0.25em] text-brand-moss/80 font-bold uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-orange rounded-full"></span>
            Seasonal Karnataka Harvest Spotlight
          </h2>
        </div>

        {/* Ambient fade-out gradients on both edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#f6f3eb] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#f6f3eb] to-transparent z-10 pointer-events-none"></div>

        <div className="flex w-max animate-marquee-slow whitespace-nowrap">
          {/* Track 1 */}
          <div className="flex items-center gap-8 px-4">
            {bannerItems.map((item, idx) => (
              <div 
                key={`t1-${idx}`} 
                className="w-80 inline-flex flex-col bg-brand-paper border border-brand-cream p-4 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="h-44 w-full overflow-hidden bg-[#fdfbf7] border border-brand-cream/40 mb-3 flex items-center justify-center relative">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-2 right-2 bg-brand-ink/90 text-brand-lime text-[9px] font-mono tracking-wider uppercase px-2 py-0.5">
                    {item.tag}
                  </span>
                </div>
                <div className="flex flex-col">
                  <h4 className="font-serif font-bold text-base text-brand-ink truncate">{item.title}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-brand-orange shrink-0" />
                    <span className="text-[10px] font-mono text-brand-moss font-bold uppercase tracking-wider">{item.source}</span>
                  </div>
                  <p className="text-xs text-brand-moss/80 font-sans mt-2 whitespace-normal line-clamp-2">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Track 2 (Duplicate for seamless infinite looping transition) */}
          <div className="flex items-center gap-8 px-4">
            {bannerItems.map((item, idx) => (
              <div 
                key={`t2-${idx}`} 
                className="w-80 inline-flex flex-col bg-brand-paper border border-brand-cream p-4 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="h-44 w-full overflow-hidden bg-[#fdfbf7] border border-brand-cream/40 mb-3 flex items-center justify-center relative">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-2 right-2 bg-brand-ink/90 text-brand-lime text-[9px] font-mono tracking-wider uppercase px-2 py-0.5">
                    {item.tag}
                  </span>
                </div>
                <div className="flex flex-col">
                  <h4 className="font-serif font-bold text-base text-brand-ink truncate">{item.title}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-brand-orange shrink-0" />
                    <span className="text-[10px] font-mono text-brand-moss font-bold uppercase tracking-wider">{item.source}</span>
                  </div>
                  <p className="text-xs text-brand-moss/80 font-sans mt-2 whitespace-normal line-clamp-2">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10">
        
        {/* Workspace Sidebar Tabs */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-brand-cream/60 pr-0 lg:pr-6">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-semibold tracking-tight transition-all rounded-none w-full whitespace-nowrap ${
              activeTab === 'catalog' 
                ? 'bg-brand-ink text-brand-lime shadow-md shadow-brand-ink/10' 
                : 'text-brand-ink/75 hover:bg-brand-cream/50'
            }`}
          >
            <Sprout className="w-4 h-4" />
            Produce Catalog
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-semibold tracking-tight transition-all rounded-none w-full whitespace-nowrap ${
              activeTab === 'reports' 
                ? 'bg-brand-ink text-brand-lime shadow-md shadow-brand-ink/10' 
                : 'text-brand-ink/75 hover:bg-brand-cream/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Lab Certifications
          </button>
          
          <button
            onClick={() => setActiveTab('estimator')}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-semibold tracking-tight transition-all rounded-none w-full whitespace-nowrap ${
              activeTab === 'estimator' 
                ? 'bg-brand-ink text-brand-lime shadow-md shadow-brand-ink/10' 
                : 'text-brand-ink/75 hover:bg-brand-cream/50'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Supply Cost Estimator
          </button>
          
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex items-center gap-2.5 px-4 py-3 text-sm font-semibold tracking-tight transition-all rounded-none w-full whitespace-nowrap relative ${
              activeTab === 'inquiries' 
                ? 'bg-brand-ink text-brand-lime shadow-md shadow-brand-ink/10' 
                : 'text-brand-ink/75 hover:bg-brand-cream/50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Inquiries & Logistics
            {myInquiries.length > 0 && (
              <span className="ml-auto bg-brand-orange text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
                {myInquiries.length}
              </span>
            )}
          </button>
        </aside>

        {/* Workspace Active Display View */}
        <section className="flex-1">
          <AnimatePresence mode="wait">
            
            {/* View: Produce Catalog */}
            {activeTab === 'catalog' && (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="col-span-full mb-4">
                  <h2 className="font-serif text-3xl font-bold text-brand-ink tracking-tight mb-2">Weekly Fresh Harvest</h2>
                  <p className="text-sm text-brand-moss">Browse currently available pesticide-free fruits, vegetables, and exotics ready for next-day 6 AM delivery.</p>
                </div>

                {products.map((prod) => (
                  <div key={prod.id} className="bg-[#faf8f3] border border-brand-cream p-5 flex flex-col justify-between hover:shadow-lg transition-all group">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <span className="text-[10px] font-mono tracking-wider uppercase text-brand-orange bg-brand-orange/10 px-2 py-0.5">
                          {prod.category}
                        </span>
                        <span className="text-xs font-mono font-bold text-brand-ink">{prod.priceRange}</span>
                      </div>
                      
                      <h3 className="font-serif text-xl font-bold text-brand-ink group-hover:text-brand-moss transition-colors mb-1">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-brand-moss leading-relaxed mb-4">{prod.description}</p>
                    </div>

                    <div className="border-t border-brand-cream/60 pt-4 mt-2">
                      <div className="flex items-center gap-2 text-xs text-brand-moss mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                        <span className="truncate">Sourced: <strong>{prod.farmSource}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-ink">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-moss shrink-0" />
                        <span>Weekly Status: <strong className="text-[#3b6833]">{prod.weeklyTestStatus}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* View: Lab Certifications */}
            {activeTab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="font-serif text-3xl font-bold text-brand-ink tracking-tight mb-2">Toxicology Certifications</h2>
                  <p className="text-sm text-brand-moss">We scan every single crop batch weekly for 148+ synthetic fertilizers and pesticides. Zero residues, guaranteed.</p>
                </div>

                <div className="bg-[#faf8f3] border border-brand-cream overflow-hidden">
                  <div className="p-5 bg-brand-ink text-brand-paper flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-serif text-lg font-bold">Standard of Integrity</h3>
                      <p className="text-xs text-brand-lime font-mono">ALL BATCHES MATCH BENGALURU MUNICIPAL HEALTH NORMS & INDEPENDENT SGS PROTOCOLS</p>
                    </div>
                    <div className="bg-brand-lime text-brand-ink font-mono text-[10px] font-bold px-3 py-1 uppercase tracking-wider">
                      Zero Tolerance Zone
                    </div>
                  </div>

                  <div className="divide-y divide-brand-cream/80">
                    {reports.map((rep) => (
                      <div key={rep.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-brand-orange font-bold">{rep.id}</span>
                            <span className="text-[10px] font-mono text-brand-moss bg-brand-cream px-2 py-0.5 rounded-none">
                              Batch: {rep.batchId}
                            </span>
                          </div>
                          <h4 className="font-serif text-xl font-bold text-brand-ink">{rep.result}</h4>
                          <p className="text-xs text-brand-moss">Tested on {rep.testDate} at {rep.labName}</p>
                          <p className="text-xs font-mono text-[#2f5527] bg-[#e1ecd9] inline-block px-2.5 py-0.5">
                            Scanned for {rep.pesticideScanCount} pesticide compounds
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end shrink-0 gap-2 w-full md:w-auto">
                          <span className="flex items-center gap-1.5 text-xs text-brand-moss font-bold">
                            <CheckCircle2 className="w-4 h-4 text-[#355a29]" />
                            {rep.status}
                          </span>
                          <a 
                            href={rep.downloadUrl}
                            onClick={(e) => { e.preventDefault(); alert(`Downloading PDF Verification Report for Batch: ${rep.batchId}`); }}
                            className="text-xs font-bold text-brand-ink underline hover:text-brand-moss whitespace-nowrap"
                          >
                            Download verified PDF certificate
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* View: Supply Cost Estimator */}
            {activeTab === 'estimator' && (
              <motion.div
                key="estimator"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="font-serif text-3xl font-bold text-brand-ink tracking-tight mb-2">Smart Weekly Cost Estimator</h2>
                  <p className="text-sm text-brand-moss">Input your restaurant's weekly volume requirements. High volume unlocks exclusive discount tiers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Volume Discount Indicator */}
                  <div className="bg-brand-cream/35 p-4 border border-brand-cream/80 text-center flex flex-col justify-center">
                    <span className="text-[10px] font-mono tracking-wider block text-brand-moss uppercase mb-1">Standard Tier</span>
                    <strong className="font-serif text-xl font-bold text-brand-ink">Volume &lt; 20 kg</strong>
                    <span className="text-xs text-brand-moss mt-1">Base Restaurant Rate</span>
                  </div>
                  <div className="bg-brand-lime/10 p-4 border border-brand-lime/30 text-center flex flex-col justify-center">
                    <span className="text-[10px] font-mono tracking-wider block text-brand-moss uppercase mb-1">Mid-Volume Tier</span>
                    <strong className="font-serif text-xl font-bold text-brand-ink">Volume &gt;= 20 kg</strong>
                    <span className="text-xs text-[#2c4e22] font-semibold mt-1">Save 5% on all items</span>
                  </div>
                  <div className="bg-brand-ink text-brand-paper p-4 text-center flex flex-col justify-center">
                    <span className="text-[10px] font-mono tracking-wider block text-brand-lime uppercase mb-1">High-Volume Tier</span>
                    <strong className="font-serif text-xl font-bold text-brand-lime">Volume &gt;= 50 kg</strong>
                    <span className="text-xs text-brand-cream mt-1">Save 10% on all items</span>
                  </div>
                </div>

                {/* Estimate Inputs List */}
                <div className="bg-[#faf8f3] border border-brand-cream divide-y divide-brand-cream/60">
                  {products.map((prod) => {
                    const currentQty = estimateQuantities[prod.id] || 0;
                    return (
                      <div key={prod.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="max-w-md">
                          <h4 className="font-serif text-lg font-bold text-brand-ink">{prod.name}</h4>
                          <p className="text-xs text-brand-moss">{prod.farmSource}</p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-xs font-mono text-brand-moss">Baseline: {prod.priceRange}</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min="0"
                              max="1000"
                              value={currentQty || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setEstimateQuantities(prev => ({ ...prev, [prod.id]: val }));
                              }}
                              placeholder="0"
                              className="w-20 bg-white border border-brand-cream text-brand-ink px-3 py-1.5 text-center font-mono focus:outline-none focus:border-brand-ink"
                            />
                            <span className="text-sm font-semibold text-brand-ink">kg</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Estimator Total Display */}
                <div className="bg-[#183b2b] text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-brand-lime">Weekly Supply Estimate</h3>
                    <p className="text-xs text-brand-cream/80 max-w-md mt-1">
                      This calculation takes into account dynamic volume tiers. Final logistics are tailored to your exact delivery time slots.
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-xs font-mono text-brand-lime">ESTIMATED WEEKLY COST</span>
                    <strong className="font-serif text-4xl font-bold text-white">₹{getEstimatedTotal().toLocaleString('en-IN')}</strong>
                    <span className="text-[10px] font-mono text-brand-cream/60">excl. local delivery fees</span>
                  </div>
                </div>

                {/* Use Estimate Button */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      if (!user) {
                        alert('Please Partner Sign-In at the top right first to submit your estimate as an official inquiry!');
                      } else {
                        setActiveTab('inquiries');
                      }
                    }}
                    className="flex items-center gap-2 bg-brand-orange hover:bg-[#d87635] text-white font-bold py-3 px-6 transition-all shadow-md shadow-brand-orange/10"
                  >
                    Proceed with this Estimate to Inquiry
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* View: Inquiries Portal */}
            {activeTab === 'inquiries' && (
              <motion.div
                key="inquiries"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-10"
              >
                <div>
                  <h2 className="font-serif text-3xl font-bold text-brand-ink tracking-tight mb-2">Restaurant Inquiries & Logistics</h2>
                  <p className="text-sm text-brand-moss">Submit custom daily requirements, schedule recurring pre-6 AM drop-offs, and track active supply logistics.</p>
                </div>

                {!user ? (
                  <div className="bg-brand-cream/25 border border-brand-cream p-12 text-center max-w-xl mx-auto space-y-6">
                    <ClipboardList className="w-12 h-12 text-brand-moss mx-auto animate-bounce" />
                    <div className="space-y-2">
                      <h3 className="font-serif text-2xl font-bold text-brand-ink">Access Secure Logistics Portal</h3>
                      <p className="text-sm text-brand-moss max-w-md mx-auto leading-relaxed">
                        To protect trade secrets, price transparency, and manage active deliveries, we require authenticated partner sessions via Google Sign-In.
                      </p>
                    </div>
                    <button 
                      onClick={handleLogin}
                      className="inline-flex items-center gap-2 bg-brand-ink text-brand-paper px-6 py-3 font-semibold text-sm hover:bg-brand-moss transition-all rounded-none"
                    >
                      <LogIn className="w-4 h-4 text-brand-lime" />
                      Sign In using Google
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Submission Inquiry Form */}
                    <div className="lg:col-span-7 bg-[#faf8f3] border border-brand-cream p-6">
                      <h3 className="font-serif text-xl font-bold text-brand-ink border-b border-brand-cream pb-3 mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-orange" />
                        Create New Restaurant Inquiry
                      </h3>

                      {inquirySuccess && (
                        <div className="bg-[#e4eed9] border border-brand-moss p-4 text-brand-ink mb-6 text-sm flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-[#3e6927] shrink-0" />
                          <div>
                            <strong>Inquiry Submitted Successfully!</strong>
                            <p className="text-xs text-brand-moss mt-0.5">Our Bangalore logistics officer will contact you within 2 hours to finalize onboarding.</p>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleSubmitInquiry} className="space-y-5">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-brand-ink font-mono uppercase">RESTAURANT NAME</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Olive Bar & Kitchen, Bangalore"
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                            className="w-full bg-white border border-brand-cream text-brand-ink px-4 py-2.5 focus:outline-none focus:border-brand-ink"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-brand-ink font-mono uppercase">LOGISTICS DIRECT CONTACT (PHONE)</label>
                          <input 
                            type="tel" 
                            required
                            placeholder="e.g. +91 98805 85292"
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            className="w-full bg-white border border-brand-cream text-brand-ink px-4 py-2.5 focus:outline-none focus:border-brand-ink"
                          />
                        </div>

                        {/* Selected estimate summary */}
                        <div className="bg-brand-cream/30 p-4 border border-brand-cream space-y-2">
                          <h4 className="text-xs font-bold font-mono text-brand-moss uppercase">Inquiry Items Summary</h4>
                          {Object.keys(estimateQuantities).some(k => (estimateQuantities[k] || 0) > 0) ? (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-2">
                                {products.map((p) => {
                                  const qty = estimateQuantities[p.id] || 0;
                                  return qty > 0 ? (
                                    <span key={p.id} className="text-xs bg-white border border-brand-cream px-2.5 py-1 text-brand-ink font-mono">
                                      {p.name} — {qty}kg
                                    </span>
                                  ) : null;
                                })}
                              </div>
                              <div className="flex justify-between items-center border-t border-brand-cream/50 pt-2 mt-2">
                                <span className="text-xs text-brand-moss">Live Pricing Tier Applied:</span>
                                <strong className="text-sm text-brand-ink">Weekly Cost: ~₹{getEstimatedTotal().toLocaleString('en-IN')}</strong>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-brand-moss italic">
                              No specific quantities requested. Proceed to submit a general onboarding inquiry for custom pesticide-free supply setup.
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={submittingInquiry}
                          className="w-full bg-brand-ink text-brand-paper hover:bg-brand-moss transition-all py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {submittingInquiry ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-brand-lime" />
                              Submitting Inquiry securely...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 text-brand-lime" />
                              Submit Official Supply Inquiry
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Historical Inquiries List */}
                    <div className="lg:col-span-5 space-y-6">
                      <h3 className="font-serif text-xl font-bold text-brand-ink flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-moss" />
                        Logistics History
                      </h3>

                      {myInquiries.length === 0 ? (
                        <div className="bg-brand-cream/20 p-6 text-center border border-brand-cream/50">
                          <p className="text-xs text-brand-moss italic">No previous inquiries. Submit your first onboarding request above.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                          {myInquiries.map((inq) => (
                            <div key={inq.id} className="bg-white border border-brand-cream p-4 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-mono text-brand-moss">INQ-{inq.id}</span>
                                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 ${
                                  inq.status === 'delivered' 
                                    ? 'bg-[#e4eed9] text-[#3e6927]' 
                                    : 'bg-brand-orange/10 text-brand-orange'
                                }`}>
                                  {inq.status}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <h4 className="font-serif font-bold text-brand-ink">{inq.restaurantName}</h4>
                                <p className="text-xs text-brand-moss flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-brand-orange" />
                                  {inq.contactNumber}
                                </p>
                                <p className="text-xs text-brand-ink font-mono bg-brand-paper/40 p-2 border border-brand-cream/40">
                                  {inq.items}
                                </p>
                              </div>

                              <div className="border-t border-brand-cream/50 pt-2 flex justify-between items-center text-xs text-brand-moss">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(inq.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                </span>
                                <strong className="text-brand-ink font-semibold">₹{parseInt(inq.estimatedCost).toLocaleString('en-IN')}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>

      {/* Elegant Editorial Footer */}
      <footer className="bg-[#183b2b] text-brand-paper py-10 mt-12 border-t border-brand-cream/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Sprout className="w-6 h-6 text-brand-lime" />
            <span className="font-serif text-lg font-bold tracking-tight">The Soil Theory .</span>
          </div>
          <div className="text-center md:text-right space-y-1">
            <p className="text-xs text-brand-cream/80">
              © {new Date().getFullYear()} The Soil Theory Agriculture LLP. All Rights Reserved.
            </p>
            <p className="text-[10px] text-brand-cream/60 font-mono flex items-center justify-center md:justify-end gap-2">
              <span>Bengaluru Office: Indiranagar Stage 2, Bangalore, KA, India. Hello@soiltheory.in</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => navigateTo('/admin/login')}
                className="underline hover:text-brand-lime transition-colors cursor-pointer"
                id="footer-admin-link"
              >
                Admin Portal
              </button>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
