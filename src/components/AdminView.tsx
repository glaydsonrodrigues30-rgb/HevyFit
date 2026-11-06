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
import { UserDocProfile, WorkoutHistory, WorkoutRoutine, WeightEntry, TrainingCycle, Exercise, getCycleCurrentWeek } from '../types';
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
      <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] p-5 md:p-6 rounded-[24px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#7C6CFF]" />
            <span className="text-[11px] text-[#7C6CFF] font-semibold uppercase tracking-wider">Painel Administrativo</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#F2F3F5]">
            Alunos &amp; <span className="text-[#7C6CFF]">Auditoria</span>
          </h2>
          <p className="text-[13px] text-[#9AA1AD] leading-relaxed">
            Acesso administrativo somente leitura para acompanhar treinos, evolução e peso dos alunos.
          </p>
        </div>

        <div className="bg-[#1C1F26] border border-[rgba(255,255,255,0.07)] p-3 rounded-[16px] flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-[12px] bg-[#7C6CFF]/15 flex items-center justify-center text-[#7C6CFF]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-[#9AA1AD] font-semibold uppercase">Cadastrados</div>
            <div className="text-base font-semibold text-[#F2F3F5] tabular-nums">{users.length} usuários</div>
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
              <Search className="w-4 h-4 text-[#9AA1AD] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="search-users-admin"
                type="text"
                placeholder="Pesquisar por nome, e-mail ou UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[14px] pl-11 pr-4 py-3 text-[14px] text-[#F2F3F5] placeholder-[#9AA1AD]/50 focus:border-[#7C6CFF] focus:outline-none transition font-sans"
              />
            </div>

            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div id="admin-user-loading-spinner" className="w-8 h-8 rounded-full border-2 border-[#7C6CFF]/20 border-t-[#7C6CFF] animate-spin" />
                <span className="text-[13px] text-[#9AA1AD] font-medium select-none">Carregando lista de alunos...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-10 text-center space-y-2">
                <Users className="w-8 h-8 text-[#9AA1AD]/40 mx-auto" />
                <p className="text-[15px] font-semibold text-[#F2F3F5]">Nenhum aluno encontrado</p>
                <p className="text-[13px] text-[#9AA1AD]">Tente buscar usando outro termo ou e-mail.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => {
                  const hasCycle = !!user.currentCycle;
                  return (
                    <motion.div
                      key={user.userId}
                      whileHover={{ scale: 1.01, y: -2 }}
                      className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.12)] rounded-[20px] p-4.5 flex flex-col justify-between gap-4 cursor-pointer transition relative overflow-hidden"
                      onClick={() => handleSelectUser(user)}
                    >
                      {/* User basic card info */}
                      <div className="flex gap-3.5 items-start">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-[12px] object-cover border border-[rgba(255,255,255,0.08)]"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-[12px] bg-[#1C1F26] flex items-center justify-center text-[#9AA1AD]">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <div className="space-y-0.5 truncate">
                          <h3 className="font-semibold text-[#F2F3F5] text-[14px] truncate">{user.displayName}</h3>
                          <p className="text-[12px] text-[#9AA1AD] truncate">{user.email}</p>
                          <span className="text-[10px] text-[#6B7280] select-none block truncate">UID: {user.userId}</span>
                        </div>
                      </div>

                      {/* Current cycle info & details */}
                      <div className="bg-[#1C1F26] rounded-[14px] p-3 border border-[rgba(255,255,255,0.05)] space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[#9AA1AD] font-medium">Ciclo Atual</span>
                          {hasCycle ? (
                            <span className="bg-[#4ADE80]/15 text-[#4ADE80] font-semibold px-2 py-0.5 rounded-full text-[10px]">Ativo</span>
                          ) : (
                            <span className="bg-[#15171C] text-[#6B7280] px-2 py-0.5 rounded-full text-[10px]">Inativo</span>
                          )}
                        </div>
                        {hasCycle ? (
                          <div className="space-y-1">
                            <p className="text-[13px] font-semibold text-[#F2F3F5] truncate">{user.currentCycle?.name}</p>
                            <div className="flex gap-3 text-[11px] text-[#9AA1AD]">
                              <span>Foco: {user.currentCycle?.targetFocus || 'Hipertrofia'}</span>
                              <span>Semana: {getCycleCurrentWeek(user.currentCycle)}/{user.currentCycle?.durationWeeks}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[12px] text-[#6B7280] italic">Sem ciclo ativo</p>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="border-t border-[rgba(255,255,255,0.06)] pt-3 flex justify-between items-center text-[11px] text-[#9AA1AD]">
                        <span>Criado: {formatPrettyDate(user.createdAt)}</span>
                        <span className="flex items-center gap-1 text-[#7C6CFF] font-medium group-hover:text-[#8E80FF] transition">
                          Visualizar <ChevronRight className="w-3.5 h-3.5" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.07)] pb-4">
              <button
                id="btn-back-to-users-admin"
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedUserData(null);
                }}
                className="flex items-center gap-2 text-[#F2F3F5] text-[13px] font-medium px-4 py-2 bg-[#15171C] border border-[rgba(255,255,255,0.08)] rounded-[12px] hover:bg-[#1C1F26] transition cursor-pointer w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Lista de Alunos</span>
              </button>

              <div className="flex items-center gap-2 bg-[#7C6CFF]/15 border border-[#7C6CFF]/25 text-[#7C6CFF] text-[12px] px-3 py-1.5 rounded-[10px] font-medium">
                <Lock className="w-3.5 h-3.5" />
                <span>MODO DE AUDITORIA (SOMENTE LEITURA)</span>
              </div>
            </div>

            {/* Profile banner metadata card */}
            <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] p-5 rounded-[20px] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
              <div className="flex gap-4 items-start md:items-center">
                {selectedUser.photoURL ? (
                  <img 
                    src={selectedUser.photoURL} 
                    alt={selectedUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-[16px] object-cover border border-[rgba(255,255,255,0.08)] shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-[16px] bg-[#1C1F26] flex items-center justify-center text-[#9AA1AD] border border-[rgba(255,255,255,0.08)] shadow-lg">
                    <User className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-[#F2F3F5] leading-tight">{selectedUser.displayName}</h2>
                  <p className="text-[13px] text-[#9AA1AD] leading-relaxed font-medium">{selectedUser.email}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B7280] mt-1 select-all">
                    <span>UID: {selectedUser.userId}</span>
                    <span>Criado em: {formatPrettyDate(selectedUser.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Current training block periodization */}
              <div className="bg-[#1C1F26] px-4.5 py-3.5 rounded-[16px] border border-[rgba(255,255,255,0.05)] w-full md:w-auto max-w-sm space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#9AA1AD] font-medium">Metas da Periodização</span>
                  <span className="text-[#4ADE80] font-semibold bg-[#4ADE80]/15 px-2 py-0.5 rounded-full text-[10px]">Ciclo Ativo</span>
                </div>
                {selectedUser.currentCycle ? (
                  <div className="space-y-1">
                    <p className="text-[13px] font-semibold text-[#F2F3F5] truncate">{selectedUser.currentCycle.name}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#9AA1AD] tabular-nums">
                      <span>Semana: {getCycleCurrentWeek(selectedUser.currentCycle)} de {selectedUser.currentCycle.durationWeeks}</span>
                      <span>Meta Peso: {selectedUser.currentCycle.goalWeight || '--'} kg</span>
                      <span className="col-span-2 truncate">Objetivo: {selectedUser.currentCycle.targetFocus || 'Não informado'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#6B7280] italic py-1">Sem ciclo ativo cadastrado.</p>
                )}
              </div>
            </div>

            {/* Dashboard detail counters banner */}
            {selectedUserData && (
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] p-3.5 md:p-4 rounded-[16px] flex items-center gap-3">
                  <div className="p-2.5 bg-[#7C6CFF]/15 text-[#7C6CFF] rounded-[12px]">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9AA1AD] font-semibold uppercase">Treinos Salvos</div>
                    <div className="text-base md:text-xl font-semibold text-[#F2F3F5] tabular-nums mt-0.5">{selectedUserData.history.length}</div>
                  </div>
                </div>

                <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] p-3.5 md:p-4 rounded-[16px] flex items-center gap-3">
                  <div className="p-2.5 bg-sky-500/15 text-sky-400 rounded-[12px]">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9AA1AD] font-semibold uppercase">Rotinas Criadas</div>
                    <div className="text-base md:text-xl font-semibold text-[#F2F3F5] tabular-nums mt-0.5">{selectedUserData.routines.length}</div>
                  </div>
                </div>

                <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] p-3.5 md:p-4 rounded-[16px] flex items-center gap-3">
                  <div className="p-2.5 bg-[#FF6B6B]/15 text-[#FF6B6B] rounded-[12px]">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9AA1AD] font-semibold uppercase">Pesagens</div>
                    <div className="text-base md:text-xl font-semibold text-[#F2F3F5] tabular-nums mt-0.5">{selectedUserData.weights.length}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub Nav Tab Selector */}
            <div className="flex border-b border-[rgba(255,255,255,0.07)] gap-2">
              {[
                { id: 'workouts', label: 'Histórico de Treino', icon: History, colorClass: 'text-[#7C6CFF] border-[#7C6CFF]' },
                { id: 'routines', label: 'Rotinas e Modelos', icon: Dumbbell, colorClass: 'text-sky-400 border-sky-400' },
                { id: 'weights', label: 'Peso Corporal', icon: Scale, colorClass: 'text-[#FF6B6B] border-[#FF6B6B]' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSubTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition border-b-2 cursor-pointer ${
                      isActive 
                        ? `${tab.colorClass} bg-[#1C1F26]/40` 
                        : 'text-[#9AA1AD] border-transparent hover:text-[#F2F3F5]'
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
                  <div className="w-8 h-8 rounded-full border-2 border-[#7C6CFF]/20 border-t-[#7C6CFF] animate-spin" />
                  <span className="text-[13px] text-[#9AA1AD] font-medium select-none">Carregando dados do aluno...</span>
                </div>
              ) : !selectedUserData ? (
                <div className="text-center text-[#9AA1AD] py-10">Erro ao carregar dados do usuário.</div>
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
                        <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-8 text-center text-[#9AA1AD] text-[13px] italic">
                          O usuário ainda não realizou ou salvou sessões de treino.
                        </div>
                      ) : (
                        <div className="space-y-4">
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
                              <div key={workout.id} className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 space-y-4">
                                {/* Header of workout details */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[rgba(255,255,255,0.06)] pb-3">
                                  <div>
                                    <h4 className="font-semibold text-[#F2F3F5] text-base">{workout.name}</h4>
                                    <span className="text-[11px] text-[#7C6CFF] font-medium lowercase">{formattedDate}</span>
                                  </div>
                                  <div className="flex gap-4 text-[12px] font-medium text-[#9AA1AD] tabular-nums">
                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#9AA1AD]" /> {prettyDuration}</span>
                                    <span>Volume: <span className="text-[#F2F3F5] font-semibold">{stats.volume.toLocaleString('pt-BR')} kg</span></span>
                                    <span>Séries: <span className="text-[#F2F3F5] font-semibold">{stats.sets}</span></span>
                                  </div>
                                </div>

                                {/* Comments if left by user */}
                                {workout.comments && (
                                  <div className="bg-[#1C1F26] p-3 rounded-[12px] border border-[rgba(255,255,255,0.05)] text-[13px] text-[#9AA1AD] leading-relaxed italic">
                                    "{workout.comments}"
                                  </div>
                                )}

                                {/* Exercise matrix logged */}
                                <div className="space-y-4">
                                  {workout.exercises.map((logEx, indexEx) => {
                                    const exInfo = exerciseById(logEx.exerciseId);
                                    return (
                                      <div key={logEx.exerciseId || indexEx} className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 border-l-2 border-[#7C6CFF] pl-3">
                                          <div>
                                            <h5 className="font-semibold text-[#F2F3F5] text-[13px]">{exInfo?.name || logEx.exerciseId || 'Exercício Inexistente'}</h5>
                                            <span className="text-[11px] text-[#9AA1AD]">{exInfo?.targetMuscle || 'Livre'} | {exInfo?.equipment || 'Halter'}</span>
                                          </div>
                                          {logEx.restTimer && (
                                            <span className="text-[11px] text-[#9AA1AD] bg-[#1C1F26] px-2 py-0.5 rounded-[8px] border border-[rgba(255,255,255,0.06)] tabular-nums">Timer: {logEx.restTimer}s</span>
                                          )}
                                        </div>

                                        {/* Set Rows table */}
                                        <div className="bg-[#1C1F26]/70 border border-[rgba(255,255,255,0.05)] rounded-[12px] overflow-hidden">
                                          <div className="grid grid-cols-4 px-3 py-1.5 border-b border-[rgba(255,255,255,0.05)] text-[10px] text-[#9AA1AD] font-medium uppercase tracking-wider">
                                            <span>Série</span>
                                            <span>Tipo</span>
                                            <span className="text-center">Carga (kg)</span>
                                            <span className="text-center">Repetições</span>
                                          </div>
                                          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                                            {logEx.sets.map((set, setIdx) => (
                                              <div key={set.id || setIdx} className="grid grid-cols-4 px-3 py-2 text-xs font-medium text-[#F2F3F5] tabular-nums">
                                                <span className="text-[#6B7280] text-[11px]">#{setIdx + 1}</span>
                                                <span className={`text-[10px] font-semibold ${
                                                  set.type === 'Aquecimento' ? 'text-[#F5B84B]' : set.type === 'Adaptação' ? 'text-sky-400' : 'text-[#7C6CFF]'
                                                }`}>{set.type || 'Trabalho'}</span>
                                                <span className="text-center text-[#F2F3F5]">{set.weight != null ? `${set.weight} kg` : '--'}</span>
                                                <span className="text-center text-[#F2F3F5]">{set.reps != null ? `${set.reps}` : '--'}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Notes and progression observations if present */}
                                        {logEx.observations && (
                                          <p className="text-[11px] text-[#9AA1AD] pl-3 leading-normal"><span className="text-[10px] text-[#6B7280] font-medium uppercase">Obs:</span> {logEx.observations}</p>
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
                        <div className="col-span-full bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-8 text-center text-[#9AA1AD] text-[13px] italic">
                          O usuário ainda não criou rotinas salvas no HevyFit.
                        </div>
                      ) : (
                        selectedUserData.routines.map((routine) => (
                          <div key={routine.id} className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-4.5 space-y-3.5 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-[#F2F3F5] text-base leading-tight">{routine.name}</h4>
                                <span className="bg-sky-500/15 text-sky-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">Modelo</span>
                              </div>
                              {routine.description && (
                                <p className="text-[12px] text-[#9AA1AD] leading-relaxed bg-[#1C1F26] border border-[rgba(255,255,255,0.05)] p-2.5 rounded-[12px]">{routine.description}</p>
                              )}

                              <div className="space-y-2 pt-2">
                                <span className="text-[11px] text-[#9AA1AD] font-medium">Exercícios ({routine.exercises.length}):</span>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {routine.exercises.map((item, exIdx) => {
                                    const exInfo = exerciseById(item.exerciseId);
                                    return (
                                      <div key={item.exerciseId || exIdx} className="bg-[#1C1F26] p-2.5 border border-[rgba(255,255,255,0.05)] rounded-[12px] space-y-1">
                                        <div className="flex justify-between gap-2 items-start">
                                          <span className="text-[13px] font-semibold text-[#F2F3F5] truncate">{exInfo?.name || item.exerciseId || 'Exercício'}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                          {item.sets.map((set, setIdx) => (
                                            <span key={setIdx} className="text-[10px] tabular-nums bg-[#15171C] border border-[rgba(255,255,255,0.07)] text-[#9AA1AD] px-2 py-0.5 rounded-[8px]">
                                              #{setIdx + 1}: {set.reps} reps @ {set.weight}kg
                                            </span>
                                          ))}
                                        </div>
                                        {item.progressionNotes && (
                                          <p className="text-[11px] text-[#9AA1AD] italic pt-0.5">Progresso: {item.progressionNotes}</p>
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
                        <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-8 text-center text-[#9AA1AD] text-[13px] italic">
                          O usuário ainda não registrou pesos corporais no diário.
                        </div>
                      ) : (
                        <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] rounded-[20px] p-5 space-y-4">
                          <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.07)] pb-3">
                            <Scale className="w-4 h-4 text-[#FF6B6B]" />
                            <h4 className="font-semibold text-[#F2F3F5] text-sm">Histórico de Peso de {selectedUser.displayName}</h4>
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
                                  <div key={entry.id} className="bg-[#1C1F26] p-3 rounded-[12px] border border-[rgba(255,255,255,0.05)] flex justify-between items-center text-xs">
                                    <div className="space-y-0.5">
                                      <span className="text-[11px] text-[#9AA1AD] block">{formatted}</span>
                                      <span className="font-semibold text-[#F2F3F5] text-sm tabular-nums">{entry.weight.toFixed(1)} kg</span>
                                      {entry.note && (
                                        <p className="text-[11px] text-[#9AA1AD] pt-1">Nota: {entry.note}</p>
                                      )}
                                    </div>
                                    {diffText && (
                                      <div className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-[8px] tabular-nums ${
                                        isUp ? 'text-[#FF6B6B] bg-[#FF6B6B]/15' : isDown ? 'text-[#4ADE80] bg-[#4ADE80]/15' : 'text-[#9AA1AD] bg-[#15171C]'
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
                              <div className="bg-[#1C1F26] rounded-[16px] p-4 border border-[rgba(255,255,255,0.05)] flex flex-col justify-between h-full">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <Info className="w-4 h-4 text-[#7C6CFF]" />
                                    <h5 className="font-semibold text-[#F2F3F5] text-xs">Estatísticas do Peso</h5>
                                  </div>
                                  <p className="text-[12px] text-[#9AA1AD] leading-relaxed">
                                    A evolução do peso corporal do aluno auxilia no acompanhamento da ingestão calórica e da hipertrofia sob o ciclo de periodização.
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4">
                                  <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] p-3 rounded-[12px]">
                                    <span className="text-[10px] text-[#9AA1AD] font-semibold uppercase block">Peso Atual</span>
                                    <span className="text-base font-semibold text-[#F2F3F5] tabular-nums">
                                      {selectedUserData.weights[0]?.weight?.toFixed(1) || '--'} kg
                                    </span>
                                  </div>
                                  <div className="bg-[#15171C] border border-[rgba(255,255,255,0.07)] p-3 rounded-[12px]">
                                    <span className="text-[10px] text-[#9AA1AD] font-semibold uppercase block">Pesagens</span>
                                    <span className="text-base font-semibold text-[#F2F3F5] tabular-nums">
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
