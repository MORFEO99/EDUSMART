import { useState, useEffect } from 'react';
import { Target, Star, Gift, CheckCircle } from 'lucide-react';
import { gamificationAPI } from '../api';

export default function ChallengeBoard({ onUpdateStats }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = () => {
    setLoading(true);
    gamificationAPI.getChallenges()
      .then(setChallenges)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleParticipate = (challengeId) => {
    gamificationAPI.participateChallenge(challengeId)
      .then(res => {
        // Update local state
        setChallenges(prev => prev.map(c => c.challenge.id === challengeId ? res.reto : c));
        // Update user stats (coins, points) in parent
        if (onUpdateStats && res.user_stats) {
          onUpdateStats(res.user_stats);
        }
      })
      .catch(console.error);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando retos...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
          <Target size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Retos Educativos</h2>
          <p className="text-sm text-gray-500">Completa desafíos para ganar puntos extra y monedas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challenges.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-500">
            No hay retos activos en este momento.
          </div>
        )}
        {challenges.map(uc => {
          const c = uc.challenge;
          const isCompleted = uc.estado === 'COMPLETADO';
          const progressPercent = Math.min(100, Math.round((uc.progreso / uc.meta) * 100));
          
          return (
            <div key={c.id} className={`p-4 rounded-xl border ${isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-indigo-300'} transition-all`}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-800">{c.titulo}</h3>
                {isCompleted ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      <Star size={14} /> {c.recompensa_puntos} pts
                    </span>
                    <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md">
                      <Gift size={14} /> {c.recompensa_coins}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">{c.descripcion}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progreso</span>
                  <span>{uc.progreso} / {uc.meta}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {!isCompleted && (
                <button 
                  onClick={() => handleParticipate(c.id)}
                  className="mt-4 w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
                >
                  Avanzar Reto (+1)
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
