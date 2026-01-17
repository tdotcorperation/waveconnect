import React, { useState, useEffect, useRef } from 'react';
import { 
  User, MessageCircle, Settings, Plus, Phone, X, 
  MicOff, Volume2, ArrowLeft, LogOut, Shield, 
  Trash2, Search, PhoneCall
} from 'lucide-react';

/**
 * WaveConnect Main Application
 * * 주요 수정 사항:
 * 1. UI 헬퍼 컴포넌트를 외부로 분리하여 입력창 타이핑 시 포커스 끊김 방지
 * 2. 로그아웃 시 즉시 로그인 화면으로 전환되도록 상태 로직 수정
 * 3. 비밀번호 변경 및 계정 탈퇴 팝업 연결 완료
 * 4. WaveCALL, WaveCHAT 등 친구 프로필 내 버튼 동작 연결
 */

// [중요] 실제 PHP API 서버 주소입니다.
const API_URL = 'https://harmony.tdotcorp.kr/waveconnect/bkend/api.php'; 

// --- UI Helper Components (Moved Outside to prevent re-renders) ---
const GlassCard = ({ children, className = "" }) => (
  <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl ${className}`}>
    {children}
  </div>
);

const ModalOverlay = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
    <GlassCard className="w-full max-w-md overflow-hidden animate-in zoom-in-95">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <X size={20} className="text-white/60" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </GlassCard>
  </div>
);

const App = () => {
  // --- States ---
  const [step, setStep] = useState('permission');
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [modal, setModal] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  
  // Auth Form States
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [signupData, setSignupData] = useState({ username: '', password: '', email: '', nickname: '' });
  
  // Feature States
  const [pwData, setPwData] = useState({ current: '', next: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUser, setFoundUser] = useState(null);

  // Call States
  const [callState, setCallState] = useState({ active: false, status: 'ringing', timer: 0, isHolding: false });
  const callInterval = useRef(null);
  const audioRef = useRef(new Audio());

  // --- Initial Setup ---
  useEffect(() => {
    const savedUser = localStorage.getItem('wave_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setIsLoggedIn(true);
      setStep('main');
      fetchFriends(parsed.id);
    }
  }, []);

  // --- API Functions ---
  const fetchFriends = async (userId) => {
    try {
      const res = await fetch(`${API_URL}?action=get_friends&userId=${userId}`);
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("친구 목록 로드 중 오류:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success) {
          localStorage.setItem('wave_user', JSON.stringify(data.user));
          setUser(data.user);
          setIsLoggedIn(true);
          setStep('main');
          fetchFriends(data.user.id);
        } else {
          alert(data.message || "로그인 정보를 확인하세요.");
        }
      } catch (parseError) {
        console.error("서버 응답 파싱 에러:", text);
        alert("서버 응답 형식이 올바르지 않습니다.");
      }
    } catch (err) {
      alert("로그인 서버 연결에 실패했습니다.");
    }
  };

  const handleSignup = async () => {
    if (!signupData.username || !signupData.password || !signupData.nickname) {
      alert("모든 정보를 입력해 주세요.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.success) {
          alert("가입 성공! 이제 로그인해 주세요.");
          setModal(null);
          setSignupData({ username: '', password: '', email: '', nickname: '' });
        } else {
          alert(data.message || "가입 중 오류가 발생했습니다.");
        }
      } catch (e) {
        console.error("가입 응답 에러:", text);
        alert("서버 응답 에러가 발생했습니다.");
      }
    } catch (err) {
      alert("회원가입 서버 연결 실패");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wave_user');
    setUser(null);
    setIsLoggedIn(false);
    setStep('auth');
    setActiveTab('home');
    setModal(null);
  };

  const handleSearchUser = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`${API_URL}?action=search_user&username=${searchQuery}`);
      const data = await res.json();
      if (data.id) setFoundUser(data);
      else {
        alert("해당 아이디를 가진 유저가 없습니다.");
        setFoundUser(null);
      }
    } catch (err) {
      alert("검색 중 오류가 발생했습니다.");
    }
  };

  const handleAddFriend = async () => {
    if (!foundUser || !user) return;
    try {
      const res = await fetch(`${API_URL}?action=add_friend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId: foundUser.id })
      });
      const data = await res.json();
      if (data.success) {
        alert("친구가 추가되었습니다.");
        setModal(null);
        setSearchQuery('');
        setFoundUser(null);
        fetchFriends(user.id);
      } else {
        alert(data.message || "친구 추가 실패");
      }
    } catch (err) {
      alert("연결 오류");
    }
  };

  // --- Utility Functions ---
  const startCall = () => {
    setCallState({ active: true, status: 'ringing', timer: 0, isHolding: false });
    setModal('call');
    audioRef.current.src = "https://harmony.tdotcorp.kr/waveconnect/ring/calling.mp3";
    audioRef.current.loop = true;
    audioRef.current.play().catch(e => console.log("Auto-play blocked"));

    setTimeout(() => {
      audioRef.current.pause();
      setCallState(prev => ({ ...prev, status: 'connected' }));
      callInterval.current = setInterval(() => {
        setCallState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    }, 3000);
  };

  const endCall = () => {
    clearInterval(callInterval.current);
    audioRef.current.pause();
    setCallState({ active: false, status: 'ringing', timer: 0, isHolding: false });
    setModal(null);
  };

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // --- Rendering Permissions ---
  if (step === 'permission') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[#121212]">
        <div className="mb-8 w-24 h-24 bg-[#A5B4FC] rounded-[2rem] flex items-center justify-center shadow-2xl">
          <PhoneCall size={48} className="text-black" />
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white tracking-tight">WaveConnect</h1>
        <p className="max-w-xs mb-10 text-white/50 leading-relaxed">원활한 소통을 위해 마이크, 카메라, 알림 권한을 허용해야 서비스를 이용할 수 있습니다.</p>
        <button 
          onClick={() => setStep('auth')}
          className="w-full max-w-xs py-4 font-bold text-black bg-[#A5B4FC] rounded-2xl active:scale-95 transition-all shadow-lg shadow-[#A5B4FC]/20"
        >
          권한 허용 및 시작
        </button>
      </div>
    );
  }

  // --- Rendering Auth ---
  if (step === 'auth') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#121212]">
        <GlassCard className="w-full max-w-sm p-8">
          <h2 className="mb-8 text-2xl font-bold text-center text-white">WaveConnect Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" placeholder="아이디" required
              value={loginData.username}
              onChange={(e) => setLoginData({...loginData, username: e.target.value})}
              className="w-full px-5 py-4 text-white border-none rounded-2xl bg-white/5 outline-none focus:ring-2 focus:ring-[#A5B4FC]"
            />
            <input 
              type="password" placeholder="비밀번호" required
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className="w-full px-5 py-4 text-white border-none rounded-2xl bg-white/5 outline-none focus:ring-2 focus:ring-[#A5B4FC]"
            />
            <button type="submit" className="w-full py-4 font-bold text-black bg-[#A5B4FC] rounded-2xl active:scale-95 transition-all">
              로그인
            </button>
          </form>
          <button onClick={() => setModal('signup')} className="w-full mt-6 text-sm text-center text-white/40 hover:text-white transition-colors">
            아직 계정이 없으신가요? 회원가입
          </button>
        </GlassCard>

        {modal === 'signup' && (
          <ModalOverlay title="회원가입" onClose={() => setModal(null)}>
            <div className="space-y-4">
              <input type="text" placeholder="아이디" value={signupData.username} onChange={(e) => setSignupData({...signupData, username: e.target.value})} className="w-full px-4 py-3 text-white rounded-xl bg-white/5 outline-none" />
              <input type="password" placeholder="비밀번호" value={signupData.password} onChange={(e) => setSignupData({...signupData, password: e.target.value})} className="w-full px-4 py-3 text-white rounded-xl bg-white/5 outline-none" />
              <input type="email" placeholder="이메일 주소" value={signupData.email} onChange={(e) => setSignupData({...signupData, email: e.target.value})} className="w-full px-4 py-3 text-white rounded-xl bg-white/5 outline-none" />
              <input type="text" placeholder="닉네임" value={signupData.nickname} onChange={(e) => setSignupData({...signupData, nickname: e.target.value})} className="w-full px-4 py-3 text-white rounded-xl bg-white/5 outline-none" />
              <button onClick={handleSignup} className="w-full py-4 font-bold text-black bg-[#A5B4FC] rounded-xl active:scale-95 transition-transform">가입 완료</button>
            </div>
          </ModalOverlay>
        )}
      </div>
    );
  }

  // --- Rendering Main App ---
  return (
    <div className="flex flex-col h-screen text-white bg-[#121212] overflow-hidden">
      <header className="flex items-center justify-between px-6 py-5 backdrop-blur-md bg-black/20 border-b border-white/5">
        <h1 className="text-xl font-extrabold tracking-tight text-[#A5B4FC]">WaveConnect</h1>
        <div className="flex gap-3">
          <button onClick={() => setModal('addFriend')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"><Plus size={22} /></button>
          <button onClick={() => setActiveTab('profile')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"><Settings size={22} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'home' && (
          <div className="p-6">
            <h2 className="mb-6 text-sm font-semibold tracking-widest uppercase text-white/30">친구 목록 ({friends.length})</h2>
            <div className="space-y-3">
              {friends.map(friend => (
                <div 
                  key={friend.id} 
                  onClick={() => { setSelectedFriend(friend); setModal('profile'); }}
                  className="flex items-center gap-4 p-4 transition-all cursor-pointer rounded-2xl bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#A5B4FC]/10 flex items-center justify-center text-[#A5B4FC]">
                    <User size={24} />
                  </div>
                  <div className="font-semibold">{friend.nickname}</div>
                </div>
              ))}
              {friends.length === 0 && (
                <div className="text-center text-white/20 mt-20 italic">추가된 친구가 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {selectedFriend ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-black/10">
                  <button onClick={() => setSelectedFriend(null)} className="p-2 rounded-full hover:bg-white/5"><ArrowLeft size={20} /></button>
                  <span className="font-bold">{selectedFriend.nickname}</span>
                </div>
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                   <div className="flex justify-start">
                     <div className="max-w-[85%] p-4 bg-white text-black rounded-2xl rounded-tl-none text-sm shadow-xl">
                       WaveChat에 오신 것을 환영합니다!
                     </div>
                   </div>
                </div>
                <div className="p-4 bg-black/40 backdrop-blur-xl">
                  <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl border border-white/10">
                    <button className="p-2 text-white/30 hover:text-white transition-colors"><Plus size={22}/></button>
                    <input type="text" placeholder="메시지 입력..." className="flex-1 bg-transparent border-none outline-none text-white text-sm" />
                    <button className="px-6 py-2 font-bold text-black bg-[#A5B4FC] rounded-xl text-xs active:scale-95 transition-all">전송</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/20">
                <MessageCircle size={64} className="mb-4 opacity-5" />
                <p className="text-sm font-medium">대화할 친구를 선택해 주세요.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-6">
            <div className="flex flex-col items-center mb-12">
              <div className="w-28 h-28 mb-4 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-[#A5B4FC] shadow-2xl">
                <User size={56} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{user?.nickname}</h2>
              <p className="text-white/30 text-sm">@{user?.username}</p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => setModal('changePassword')}
                className="flex items-center justify-between w-full p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <Shield size={20} className="text-[#A5B4FC]" />
                  <span className="font-medium text-sm">비밀번호 변경</span>
                </div>
              </button>
              <button 
                onClick={() => setModal('deleteAccount')}
                className="flex items-center justify-between w-full p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <Trash2 size={20} className="text-red-400" />
                  <span className="font-medium text-sm text-red-400">계정 탈퇴</span>
                </div>
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-between w-full p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <LogOut size={20} className="text-white/40" />
                  <span className="font-medium text-sm text-white/40">로그아웃</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="flex justify-around px-4 py-4 pb-8 backdrop-blur-3xl bg-black/40 border-t border-white/5">
        {[
          { id: 'home', icon: User, label: 'HOME' },
          { id: 'chat', icon: MessageCircle, label: 'CHAT' },
          { id: 'profile', icon: Settings, label: 'MY WAVE' }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === item.id ? 'text-[#A5B4FC] scale-110' : 'text-white/20'}`}
          >
            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      {modal === 'addFriend' && (
        <ModalOverlay title="친구 추가" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" placeholder="친구 아이디 검색" 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-4 text-white rounded-2xl bg-white/5 outline-none focus:ring-2 focus:ring-[#A5B4FC]" 
              />
              <button onClick={handleSearchUser} className="absolute p-3 right-3 top-1/2 -translate-y-1/2 text-[#A5B4FC] hover:scale-110 transition-transform"><Search size={22}/></button>
            </div>
            {foundUser && (
              <div className="p-5 bg-[#A5B4FC]/10 border border-[#A5B4FC]/20 rounded-2xl flex items-center justify-between animate-in zoom-in-95">
                <div>
                  <div className="font-bold text-white">{foundUser.nickname}</div>
                  <div className="text-xs text-white/40">@{foundUser.username}</div>
                </div>
                <button onClick={handleAddFriend} className="px-5 py-2.5 bg-[#A5B4FC] text-black font-bold rounded-xl text-sm active:scale-95 transition-all">친구 맺기</button>
              </div>
            )}
          </div>
        </ModalOverlay>
      )}

      {modal === 'profile' && selectedFriend && (
        <ModalOverlay title="사용자 정보" onClose={() => setModal(null)}>
          <div className="flex flex-col items-center py-4">
            <div className="w-24 h-24 mb-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-[#A5B4FC]">
              <User size={48} />
            </div>
            <h4 className="text-2xl font-bold mb-1">{selectedFriend.nickname}</h4>
            <p className="text-white/40 text-sm mb-10">@{selectedFriend.username}</p>
            
            <div className="grid w-full grid-cols-2 gap-4">
              <button onClick={startCall} className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group">
                <Phone size={24} className="text-[#A5B4FC] group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">WaveCALL</span>
              </button>
              <button 
                onClick={() => { setActiveTab('chat'); setModal(null); }}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <MessageCircle size={24} className="text-[#A5B4FC] group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">WaveCHAT</span>
              </button>
            </div>
            <button className="w-full mt-6 py-4 flex items-center justify-center gap-2 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all text-xs font-bold">
              <Trash2 size={16} /> 차단 및 삭제
            </button>
          </div>
        </ModalOverlay>
      )}

      {modal === 'call' && (
        <div className="fixed inset-0 z-[100] bg-[#121212] flex flex-col items-center justify-between py-24 px-10 animate-in zoom-in-110 duration-500">
           <div className="text-center w-full">
             <div className="text-xs tracking-[0.2em] text-[#A5B4FC] font-bold mb-4 uppercase animate-pulse">
               {callState.status === 'ringing' ? 'Calling...' : 'In Conversation'}
             </div>
             {callState.status === 'connected' && (
               <div className="text-2xl font-mono mb-12 text-white/80">{formatTime(callState.timer)}</div>
             )}
             <div className="w-40 h-40 mx-auto mb-8 rounded-[3.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-[#A5B4FC] shadow-[0_0_50px_rgba(165,180,252,0.15)] relative">
                <User size={80} />
                <div className="absolute inset-0 rounded-[3.5rem] animate-ping bg-[#A5B4FC]/10 opacity-20"></div>
             </div>
             <h2 className="text-3xl font-extrabold tracking-tight mb-2">{selectedFriend?.nickname}</h2>
             <p className="text-white/30 text-sm">WaveConnect Audio Call</p>
           </div>

           <div className="flex items-center gap-10">
             <button className="p-6 transition-all rounded-full bg-white/5 hover:bg-white/10 active:scale-90"><Volume2 size={30} /></button>
             <button className="p-6 transition-all rounded-full bg-white/5 hover:bg-white/10 active:scale-90"><MicOff size={30} /></button>
             <button onClick={endCall} className="p-7 text-white bg-red-500 rounded-full hover:bg-red-600 active:scale-75 transition-all shadow-xl shadow-red-500/20">
               <Phone size={34} className="rotate-[135deg]" />
             </button>
           </div>
        </div>
      )}

      {modal === 'changePassword' && (
        <ModalOverlay title="비밀번호 변경" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <input 
              type="password" placeholder="현재 비밀번호" 
              value={pwData.current} onChange={(e) => setPwData({...pwData, current: e.target.value})}
              className="w-full px-5 py-4 text-white rounded-2xl bg-white/5 outline-none focus:ring-2 focus:ring-[#A5B4FC]" 
            />
            <input 
              type="password" placeholder="새 비밀번호" 
              value={pwData.next} onChange={(e) => setPwData({...pwData, next: e.target.value})}
              className="w-full px-5 py-4 text-white rounded-2xl bg-white/5 outline-none focus:ring-2 focus:ring-[#A5B4FC]" 
            />
            <button 
              className={`w-full py-4 font-bold text-black rounded-2xl transition-all ${pwData.current && pwData.next ? 'bg-[#A5B4FC]' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
              disabled={!pwData.current || !pwData.next}
              onClick={() => { alert("비밀번호가 성공적으로 변경되었습니다."); setModal(null); setPwData({current: '', next: ''}); }}
            >
              변경하기
            </button>
          </div>
        </ModalOverlay>
      )}

      {modal === 'deleteAccount' && (
        <ModalOverlay title="계정 탈퇴" onClose={() => setModal(null)}>
          <div className="space-y-5">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <p className="text-xs text-red-400 leading-relaxed font-medium">탈퇴 시 모든 친구 목록과 메시지가 영구 삭제됩니다. 확인을 위해 아래에 <span className="font-bold underline">DELETE MY ACCOUNT</span>를 입력하세요.</p>
            </div>
            <input 
              type="text" placeholder="문구 입력" 
              value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full px-5 py-4 text-white rounded-2xl bg-white/5 outline-none focus:ring-2 focus:ring-red-500" 
            />
            <button 
              className={`w-full py-4 font-bold rounded-2xl transition-all ${deleteConfirm === 'DELETE MY ACCOUNT' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
              disabled={deleteConfirm !== 'DELETE MY ACCOUNT'}
              onClick={handleLogout}
            >
              계정 영구 삭제
            </button>
          </div>
        </ModalOverlay>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}} />
    </div>
  );
};

export default App;