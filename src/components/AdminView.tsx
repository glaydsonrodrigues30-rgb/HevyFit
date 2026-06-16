import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Calendar, 
  History, 
  Dumbbell, 
  Scale, 
  User, 
  Clock, 
  ArrowLeft, 
  Sparkles, 
  Lock, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseSync';
import { UserDocProfile, WorkoutHistory, WorkoutRoutine, WeightEntry, TrainingCycle, Exercise } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_EXERCISES } from '../repositories/mockExercises';

interface AdminViewProps {
  currentUser: any;
  availableExercises?: Exercise[];
}

export default function AdminView({ currentUser, availableExercises = INITIAL_EXERCISES }: AdminViewProps) {
  const [users, setUsers] = useState<UserDocProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected user details
  const [selectedUser, setSelectedUser] = useState<UserDocProfile | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<{
    history: WorkoutHistory[];
    routines: WorkoutRoutine[];
    weights: WeightEntry[];
  } | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [subTab, setSubTab] = useState<'workouts' | 'routines' | 'weights'>('workouts');

  // Load all users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserDocProfile[] = [];
      usersSnap.forEach((doc) => {
        const data = doc.data();
        fetchedUsers.push({
          userId: doc.id,
          email: data.email || '',
          displayName: data.displayName || 'Usuário do HevyFit',
          photoURL: data.photoURL || '',
          createdAt: data.createdAt || '',
          currentCycle: data.currentCycle || null,
          lastSeen: data.lastSeen || ''
        });
      });
      // Sort: admins/recent seen or by name
      fetchedUsers.sort((a, b) => {
        const nameA = (a.displayName || '').toLowerCase();
        const nameB = (b.displayName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users for admin view:', error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.email === 'glaydson.rodrigues30@gmail.com') {
      fetchUsers();
    }
  }, [currentUser]);

  // Load selected user's details only when active
  const handleSelectUser = async (user: UserDocProfile) => {
    setSelectedUser(user);
    setLoadingUserData(true);
    setSelectedUserData(null);
    setSubTab('workouts');

    try {
      // 1. History
      const historySnap = await getDocs(collection(db, 'users', user.userId, 'history'));
      const historyList: WorkoutHistory[] = [];
      historySnap.forEach((doc) => {
        historyList.push(doc.data() as WorkoutHistory);
      });
      historyList.sort((a, b) => b.startTime - a.startTime); // most recent first

      // 2. Routines
      const routinesSnap = await getDocs(collection(db, 'users', user.userId, 'routines'));
      const routinesList: WorkoutRoutine[] = [];
      routinesSnap.forEach((doc) => {
        routinesList.push(doc.data() as WorkoutRoutine);
      });

      // 3. Weights
      const weightsSnap = await getDocs(collection(db, 'users', user.userId, 'weights'));
      const weightsList: WeightEntry[] = [];
      weightsSnap.forEach((doc) => {
        weightsList.push(doc.data() as WeightEntry);
      });
      weightsList.sort((a, b) => b.timestamp - a.timestamp); // most recent first

      setSelectedUserData({
        history: historyList,
        routines: routinesList,
        weights: weightsList
      });
    } catch (error) {
      console.error(`Error loading details for user ${user.userId}:`, error);
      handleFirestoreError(error, OperationType.LIST, `users/${user.userId}`);
    } finally {
      setLoadingUserData(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      (user.displayName || '').toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term) ||
      user.userId.toLowerCase().includes(term)
    );
  });

  // helper to get relative day differences or pretty date
  const formatPrettyDate = (isoString?: string) => {
    if (!isoString) return '--/--/----';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const exerciseById = (id: string): Exercise | undefined => {
    return availableExercises.find(ex => ex.id === id);
  };

  // Helper inside read-only workout view
  const calculateWorkoutSummary = (workout: WorkoutHistory) => {
    let totalSets = 0;
    let totalVolume = 0;
    workout.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        if (s.completed && s.weight) {
          totalSets++;
          const repsVal = typeof s.reps === 'number' ? s.reps : parseInt(String(s.reps || '0'), 10) || 0;
          totalVolume += s.weight * repsVal;
        }
      });
    });
    return { sets: totalSets, volume: totalVolume };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
      
      {/* Admin header banner */}
      <div className="bg-gradient-to-r from-red-950/20 via-slate-900 to-slate-900 border border-red-500/10 p-5 md:p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest font-mono">Painel de Administração</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
            Estatísticas Globais de <span className="text-lime-400">Usuários</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Acesso administrativo somente leitura para analisar e inspecionar auditorias de treino, progressão e peso corporal.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-lime-500/10 flex items-center justify-center text-lime-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Cadastrados</div>
            <div className="text-lg font-mono font-bold text-white">{users.length} usuários</div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedUser ? (
          /* LIST OF USERS VIEW */
          <motion.div
            key="user-list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Search Bar */}
            <div className="w-full relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-4.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-users-admin"
                type="text"
                placeholder="Pesquisar por nome, e-mail ou UID de aluno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-lime-500/40 focus:outline-none transition font-sans"
              />
            </div>

            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div id="admin-user-loading-spinner" className="w-8 h-8 rounded-full border-2 border-lime-400/20 border-t-lime-400 animate-spin" />
                <span className="text-xs text-slate-400 font-medium select-none">Carregando lista de alunos protegida...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-slate-900 border border-slate-850 rounded-3xl p-10 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Nenhum aluno encontrado</p>
                <p className="text-xs text-slate-500">Tente buscar usando termos alternativos ou e-mail exato.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => {
                  const hasCycle = !!user.currentCycle;
                  return (
                    <motion.div
                      key={user.userId}
                      whileHover={{ scale: 1.01, y: -2 }}
                      className="bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between gap-4 cursor-pointer transition relative overflow-hidden"
                      onClick={() => handleSelectUser(user)}
                    >
                      {/* User basic card info */}
                      <div className="flex gap-3.5 items-start">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover border border-slate-800"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <div className="space-y-0.5 truncate">
                          <h3 className="font-bold text-white text-sm truncate">{user.displayName}</h3>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          <span className="text-[10px] text-slate-500 font-mono select-none block truncate">UID: {user.userId}</span>
                        </div>
                      </div>

                      {/* Current cycle info & details */}
                      <div className="bg-slate-950/65 rounded-xl p-3 border border-slate-850/40 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium uppercase font-mono tracking-wider">Ciclo Atual</span>
                          {hasCycle ? (
                            <span className="bg-lime-500/10 text-lime-400 font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide">Ativo</span>
                          ) : (
                            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[9px]">Inativo</span>
                          )}
                        </div>
                        {hasCycle ? (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-200 truncate">{user.currentCycle?.name}</p>
                            <div className="flex gap-3 text-[10px] text-slate-450 font-semibold">
                              <span>Foco: {user.currentCycle?.targetFocus || 'Hipertrofia'}</span>
                              <span>Semana: {user.currentCycle?.currentWeek}/{user.currentCycle?.durationWeeks}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">Sem ciclo de periodização cadastrado</p>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="border-t border-slate-850/60 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                        <span title="Data de criação no HevyFit">Criado: {formatPrettyDate(user.createdAt)}</span>
                        <span className="flex items-center gap-1 text-lime-400/80 font-semibold group-hover:text-lime-400 transition">
                          Visualizar Perfil <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* USER DETAILS SUMMARY PORTAL */
          <motion.div
            key="user-details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Nav back bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-5">
              <button
                id="btn-back-to-users-admin"
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedUserData(null);
                }}
                className="flex items-center gap-2 text-slate-300 hover:text-white text-xs font-bold px-3.5 py-1.5 bg-slate-900 border border-slate-850 rounded-xl hover:bg-slate-850 transition cursor-pointer w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Lista de Alunos</span>
              </button>

              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-xl font-bold font-mono">
                <Lock className="w-3.5 h-3.5 animate-pulse" />
                <span>MODO DE AUDITORIA: APENAS LEITURA</span>
              </div>
            </div>

            {/* Profile banner metadata card */}
            <div className="bg-slate-900 border border-slate-850 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
              <div className="flex gap-4 items-start md:items-center">
                {selectedUser.photoURL ? (
                  <img 
                    src={selectedUser.photoURL} 
                    alt={selectedUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-850 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-850 shadow-lg">
                    <User className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white leading-tight">{selectedUser.displayName}</h2>
                  <p className="text-xs text-slate-450 leading-relaxed font-semibold">{selectedUser.email}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-mono mt-1 select-all">
                    <span>UID: {selectedUser.userId}</span>
                    <span>Criado em: {formatPrettyDate(selectedUser.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Current training block periodization */}
              <div className="bg-slate-950 px-4.5 py-3 rounded-2xl border border-slate-850/60 w-full md:w-auto max-w-sm space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-mono uppercase tracking-wider">Metas da Periodização</span>
                  <span className="text-lime-400 font-bold bg-lime-500/10 px-2 py-0.5 rounded-full text-[9px] uppercase font-mono tracking-wider">Ciclo Ativo</span>
                </div>
                {selectedUser.currentCycle ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-100 truncate">{selectedUser.currentCycle.name}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-400 font-semibold">
                      <span>Semana: {selectedUser.currentCycle.currentWeek} de {selectedUser.currentCycle.durationWeeks}</span>
                      <span>Meta Peso: {selectedUser.currentCycle.goalWeight || '--'} kg</span>
                      <span className="col-span-2 truncate">Objetivo: {selectedUser.currentCycle.targetFocus || 'Não informado'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic py-1">O usuário não possui ciclo de treino/periodização ativo.</p>
                )}
              </div>
            </div>

            {/* Dashboard detail counters banner */}
            {selectedUserData && (
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="bg-slate-900 border border-slate-850 p-3 md:p-4 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-lime-500/10 text-lime-400 rounded-xl">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[9px] md:text-[10px] text-slate-450 font-bold uppercase select-none leading-none">Treinos Salvos</div>
                    <div className="text-base md:text-xl font-mono font-bold text-white mt-0.5">{selectedUserData.history.length}</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-3 md:p-4 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[9px] md:text-[10px] text-slate-450 font-bold uppercase select-none leading-none">Rotinas Criadas</div>
                    <div className="text-base md:text-xl font-mono font-bold text-white mt-0.5">{selectedUserData.routines.length}</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-3 md:p-4 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[9px] md:text-[10px] text-slate-450 font-bold uppercase select-none leading-none font-sans">Amostras de Peso</div>
                    <div className="text-base md:text-xl font-mono font-bold text-white mt-0.5">{selectedUserData.weights.length}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub Nav Tab Selector */}
            <div className="flex border-b border-slate-850">
              {[
                { id: 'workouts', label: 'Histórico de Treino', icon: History, colorClass: 'text-lime-400 border-lime-400' },
                { id: 'routines', label: 'Rotinas e Modelos', icon: Dumbbell, colorClass: 'text-sky-400 border-sky-400' },
                { id: 'weights', label: 'Peso Corporal', icon: Scale, colorClass: 'text-rose-400 border-rose-400' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSubTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                      isActive 
                        ? `${tab.colorClass} bg-slate-900/30` 
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub Tab Panel Renderer */}
            <div className="min-h-96">
              {loadingUserData ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-white animate-spin" />
                  <span className="text-xs text-slate-400 font-medium select-none">Buscando banco de transações do usuário...</span>
                </div>
              ) : !selectedUserData ? (
                <div className="text-center text-slate-500 py-10">Erro ao processar logs do banco Firestore.</div>
              ) : (
                <AnimatePresence mode="wait">
                  {subTab === 'workouts' && (
                    <motion.div
                      key="subtab-workouts"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {selectedUserData.history.length === 0 ? (
                        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 text-xs italic">
                          O usuário ainda não realizou ou salvou sessões de treino.
                        </div>
                      ) : (
                        <div className="space-y-4.5">
                          {selectedUserData.history.map((workout) => {
                            const stats = calculateWorkoutSummary(workout);
                            const seconds = Math.floor(workout.durationMs / 1000);
                            const minutes = Math.floor(seconds / 60);
                            const hours = Math.floor(minutes / 60);
                            const prettyDuration = hours > 0 
                              ? `${hours}h ${minutes % 60}m` 
                              : `${minutes} min`;
                            
                            const d = new Date(workout.startTime);
                            const formattedDate = d.toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            });

                            return (
                              <div key={workout.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
                                {/* Header of workout details */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-850/60 pb-3">
                                  <div>
                                    <h4 className="font-extrabold text-white text-base font-sans">{workout.name}</h4>
                                    <span className="text-[10px] text-lime-400 font-medium tracking-wide capitalize">{formattedDate}</span>
                                  </div>
                                  <div className="flex gap-4 text-[11px] font-semibold text-slate-400 font-mono">
                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-500" /> {prettyDuration}</span>
                                    <span>Volume: <span className="text-white font-bold">{stats.volume.toLocaleString('pt-BR')}kg</span></span>
                                    <span>Séries: <span className="text-white font-bold">{stats.sets}</span></span>
                                  </div>
                                </div>

                                {/* Comments if left by user */}
                                {workout.comments && (
                                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs text-slate-350 leading-relaxed font-medium">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Anotações do Treino:</div>
                                    {workout.comments}
                                  </div>
                                )}

                                {/* Exercise matrix logged */}
                                <div className="space-y-4.5">
                                  {workout.exercises.map((logEx, indexEx) => {
                                    const exInfo = exerciseById(logEx.exerciseId);
                                    return (
                                      <div key={logEx.exerciseId || indexEx} className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 border-l-2 border-lime-500 pl-3">
                                          <div>
                                            <h5 className="font-bold text-slate-100 text-xs">{exInfo?.name || logEx.exerciseId || 'Exercício Inexistente'}</h5>
                                            <span className="text-[10px] text-slate-500 font-medium">{exInfo?.targetMuscle || 'Livre'} | {exInfo?.equipment || 'Halter'}</span>
                                          </div>
                                          {logEx.restTimer && (
                                            <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-850 font-mono">Timer: {logEx.restTimer}s</span>
                                          )}
                                        </div>

                                        {/* Set Rows table */}
                                        <div className="bg-slate-950/70 border border-slate-850/40 rounded-xl overflow-hidden">
                                          <div className="grid grid-cols-4 px-3 py-1.5 border-b border-slate-850/40 text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                                            <span>Série</span>
                                            <span>Tipo</span>
                                            <span className="text-center">Carga (kg)</span>
                                            <span className="text-center">Repetições</span>
                                          </div>
                                          <div className="divide-y divide-slate-850/30">
                                            {logEx.sets.map((set, setIdx) => (
                                              <div key={set.id || setIdx} className="grid grid-cols-4 px-3 py-2 text-xs font-medium text-slate-300">
                                                <span className="text-slate-500 font-mono text-[10px] mt-0.5">#{setIdx + 1}</span>
                                                <span className={`text-[10px] font-bold ${
                                                  set.type === 'Aquecimento' ? 'text-amber-400/80' : set.type === 'Adaptação' ? 'text-sky-400/80' : 'text-lime-400/80'
                                                }`}>{set.type || 'Trabalho'}</span>
                                                <span className="text-center font-mono text-slate-200">{set.weight != null ? `${set.weight} kg` : '--'}</span>
                                                <span className="text-center font-mono text-slate-200">{set.reps != null ? `${set.reps}` : '--'}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Notes and progression observations if present */}
                                        {logEx.observations && (
                                          <p className="text-[10px] text-slate-450 pl-3 leading-normal"><span className="text-[9px] text-slate-500 uppercase font-mono font-bold">Obs:</span> {logEx.observations}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {subTab === 'routines' && (
                    <motion.div
                      key="subtab-routines"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {selectedUserData.routines.length === 0 ? (
                        <div className="col-span-full bg-slate-900 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 text-xs italic">
                          O usuário ainda não criou diretórios ou rotinas salvas no HevyFit.
                        </div>
                      ) : (
                        selectedUserData.routines.map((routine) => (
                          <div key={routine.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-4.5 space-y-3.5 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-white text-base leading-tight">{routine.name}</h4>
                                <span className="bg-sky-500/10 text-sky-400 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full font-mono">Template</span>
                              </div>
                              {routine.description && (
                                <p className="text-xs text-slate-400 font-medium leading-relaxed bg-slate-950/40 border border-slate-850/50 p-2.5 rounded-xl">{routine.description}</p>
                              )}

                              <div className="space-y-2 pt-2">
                                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">Exercícios Selecionados ({routine.exercises.length}):</span>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {routine.exercises.map((item, exIdx) => {
                                    const exInfo = exerciseById(item.exerciseId);
                                    return (
                                      <div key={item.exerciseId || exIdx} className="bg-slate-950 p-2.5 border border-slate-850/50 rounded-xl space-y-1">
                                        <div className="flex justify-between gap-2 items-start">
                                          <span className="text-xs font-extrabold text-slate-100 truncate">{exInfo?.name || item.exerciseId || 'Exercício'}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 pt-1">
                                          {item.sets.map((set, setIdx) => (
                                            <span key={setIdx} className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-850 text-slate-400 px-1.5 py-0.5 rounded">
                                              #{setIdx + 1}: {set.reps} reps @ {set.weight}kg
                                            </span>
                                          ))}
                                        </div>
                                        {item.progressionNotes && (
                                          <p className="text-[9px] text-slate-500 italic font-medium pt-0.5">Progresso: {item.progressionNotes}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}

                  {subTab === 'weights' && (
                    <motion.div
                      key="subtab-weights"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {selectedUserData.weights.length === 0 ? (
                        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 text-xs italic">
                          O usuário ainda não registrou pesos corporais no diário.
                        </div>
                      ) : (
                        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-850/80 pb-3">
                            <Scale className="w-4 h-4 text-rose-400" />
                            <h4 className="font-bold text-white text-sm uppercase font-mono tracking-wider">Histórico de Peso de {selectedUser.displayName}</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Simple weights data ledger list */}
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                              {selectedUserData.weights.map((entry, idx) => {
                                const d = new Date(entry.timestamp);
                                const formatted = d.toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });

                                // diff query
                                let diffText = '';
                                let isUp = false;
                                let isDown = false;
                                if (idx < selectedUserData.weights.length - 1) {
                                  const prevEntry = selectedUserData.weights[idx + 1];
                                  const diff = entry.weight - prevEntry.weight;
                                  if (diff > 0) {
                                    diffText = `+${diff.toFixed(1)} kg`;
                                    isUp = true;
                                  } else if (diff < 0) {
                                    diffText = `${diff.toFixed(1)} kg`;
                                    isDown = true;
                                  } else {
                                    diffText = 'Manutenção';
                                  }
                                }

                                return (
                                  <div key={entry.id} className="bg-slate-950 p-3 rounded-xl border border-slate-850/70 flex justify-between items-center text-xs">
                                    <div className="space-y-0.5">
                                      <span className="font-mono text-[10px] text-slate-500 block leading-none">{formatted}</span>
                                      <span className="font-mono font-bold text-white text-sm">{entry.weight.toFixed(1)} kg</span>
                                      {entry.note && (
                                        <p className="text-[10px] text-slate-400 font-medium leading-tight pt-1">Nota: {entry.note}</p>
                                      )}
                                    </div>
                                    {diffText && (
                                      <div className={`text-[10px] font-mono font-extrabold flex items-center gap-0.5 px-2 py-0.5 rounded-md ${
                                        isUp ? 'text-rose-400 bg-rose-500/5' : isDown ? 'text-lime-400 bg-lime-500/5' : 'text-slate-400 bg-slate-900'
                                      }`}>
                                        {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isDown ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                                        <span>{diffText}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Minimal informational stats helper box */}
                            <div className="space-y-3.5">
                              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-850/60 flex flex-col justify-between h-full">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <Info className="w-4 h-4 text-rose-400" />
                                    <h5 className="font-bold text-white text-xs uppercase tracking-wider font-mono">Estatísticas do Peso</h5>
                                  </div>
                                  <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
                                    A evolução do peso corporal do aluno auxilia no acompanhamento da ingestão calórica e da hipertrofia sob o ciclo de periodização.
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4">
                                  <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block leading-none">Peso Atual</span>
                                    <span className="text-sm font-mono font-extrabold text-white">
                                      {selectedUserData.weights[0]?.weight?.toFixed(1) || '--'} kg
                                    </span>
                                  </div>
                                  <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block leading-none">Amostras</span>
                                    <span className="text-sm font-mono font-extrabold text-white">
                                      {selectedUserData.weights.length}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
