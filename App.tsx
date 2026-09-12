
import React, { useState, useMemo, useRef } from 'react';
import { TEACHER_DATA, CRITERIA } from './constants';
import { ChecklistState, TeacherRecord } from './types';
import { analyzeCourseAudit } from './services/geminiService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import { AuthModal } from './components/AuthModal';

// URL del script consolidado que maneja todas las hojas
const SCRIPT_URL = "https://script.google.com/a/macros/continental.edu.pe/s/AKfycbxkoH9xE2X-6FvuA4D4MSXi6NcVPDyaRM2KTvSVGb0cQLPLD-i0A6lAHfNb5OcMdD4jHA/exec";

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('auth_user_session');
    } catch {
      return null;
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRecord | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>(
    CRITERIA.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {})
  );
  const [enlaceAula, setEnlaceAula] = useState('');
  const [fechaMonitoreo, setFechaMonitoreo] = useState(getTodayDateString());
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const filteredTeachers = useMemo(() => {
    if (searchTerm.length < 2) return [];
    return TEACHER_DATA.filter(t => 
      t.docente.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.unidadDidactica.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleSelectTeacher = (teacher: TeacherRecord) => {
    setSelectedTeacher(teacher);
    setSearchTerm(teacher.docente);
  };

  const toggleCriterion = (id: number) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPoints = useMemo(() => {
    return Object.entries(checklist).reduce((sum, [id, checked]) => {
      if (checked) {
        const criterion = CRITERIA.find(c => c.id === Number(id));
        return sum + (criterion?.points || 0);
      }
      return sum;
    }, 0);
  }, [checklist]);

  const notaFinal = useMemo(() => {
    const maxPoints = CRITERIA.length * 2; 
    if (maxPoints === 0) return '0.00';
    const calculo = (totalPoints / maxPoints) * 20;
    return calculo.toFixed(2);
  }, [totalPoints]);

  const handleIAAudit = async () => {
    if (!enlaceAula) {
      alert("Por favor, ingrese el enlace del aula virtual para la auditoría.");
      return;
    }
    setIsAuditing(true);
    
    const failedItems = CRITERIA
      .filter(c => !checklist[c.id])
      .map(c => c.label);

    const feedback = await analyzeCourseAudit(enlaceAula, notaFinal, failedItems);
    setAuditFeedback(feedback || "Error al procesar análisis.");
    setIsAuditing(false);
  };

  const resetForm = () => {
    setSearchTerm('');
    setSelectedTeacher(null);
    setChecklist(CRITERIA.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {}));
    setEnlaceAula('');
    setAuditFeedback(null);
    setFechaMonitoreo(getTodayDateString());
  };

  const handleExportPDF = async () => {
    if (!selectedTeacher) {
      alert("Seleccione un docente antes de generar el reporte.");
      return;
    }
    if (!reportRef.current) return;
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) exportBtn.innerText = 'GENERANDO...';
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f4f7fa'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const fileName = `Checklist_${selectedTeacher.idDocente}_${selectedTeacher.idUD}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF.');
    } finally {
      if (exportBtn) exportBtn.innerHTML = '<i class="fa-solid fa-file-arrow-down text-base"></i> REPORTE PDF';
    }
  };

  const handleExportExcel = async () => {
    if (!selectedTeacher) {
      alert("Seleccione un docente antes de guardar en Excel.");
      return;
    }
    if (!enlaceAula) {
      alert("Por favor, ingrese el enlace de la carpeta docente (OBLIGATORIO).");
      return;
    }
    
    setIsSaving(true);

    try {
      const payload = {
        appType: 'PLANIFICADOR_DOCENTE',
        programa: selectedTeacher.programa,
        periodo: selectedTeacher.periodo,
        seccion: selectedTeacher.seccion,
        idUd: selectedTeacher.idUD,
        unidadDidactica: selectedTeacher.unidadDidactica,
        idDocente: selectedTeacher.idDocente,
        docente: selectedTeacher.docente,
        inicio: selectedTeacher.inicio,
        fin: selectedTeacher.fin,
        modalidad: selectedTeacher.modalidad,
        responsable: selectedTeacher.responsable,
        enlaceAula: enlaceAula,
        fechaMonitoreo: fechaMonitoreo,
        c1: checklist[1] ? "SÍ" : "NO",
        c2: checklist[2] ? "SÍ" : "NO",
        c3: checklist[3] ? "SÍ" : "NO",
        c4: checklist[4] ? "SÍ" : "NO",
        c5: checklist[5] ? "SÍ" : "NO",
        c6: checklist[6] ? "SÍ" : "NO",
        c7: checklist[7] ? "SÍ" : "NO",
        c8: checklist[8] ? "SÍ" : "NO",
        c9: checklist[9] ? "SÍ" : "NO",
        c10: checklist[10] ? "SÍ" : "NO",
        analisisIA: auditFeedback || "No auditado",
        puntajeTotal: totalPoints,
        notaFinal: notaFinal
      };

      // TÉCNICA DE ENVÍO POR FORMULARIO OCULTO PARA SALTAR CORS
      const iframeName = 'hidden_iframe_planificador_' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = SCRIPT_URL;
      form.target = iframeName;

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'jsonData';
      input.value = JSON.stringify(payload);
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();

      // Limpieza después del envío
      setTimeout(() => {
        document.body.removeChild(form);
        document.body.removeChild(iframe);
        setShowSuccess(true);
        resetForm();
        setIsSaving(false);
        setTimeout(() => setShowSuccess(false), 3500);
      }, 2500);

    } catch (error) {
      console.error("Error saving data:", error);
      alert("Hubo un error al intentar guardar los datos. Verifique su sesión de correo institucional.");
      setIsSaving(false);
    }
  };

  const handleAuthSuccess = (userCode: string) => {
    try {
      sessionStorage.setItem('auth_user_session', userCode);
    } catch {
      // ignore
    }
    setAuthenticatedUser(userCode);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('auth_user_session');
    } catch {
      // ignore
    }
    setAuthenticatedUser(null);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-20 relative">
      {/* Popup de validación obligatoria antes de usar la app */}
      <AuthModal isOpen={!authenticatedUser} onSuccess={handleAuthSuccess} />

      {showSuccess && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
          <div className="bg-[#10a352] text-white px-8 py-4 rounded-xl shadow-[0_10px_40px_rgba(16,163,82,0.3)] flex items-center gap-4 border border-[#0d8a45]">
            <i className="fa-solid fa-check text-xl"></i>
            <span className="font-black text-sm tracking-tight uppercase">¡Datos guardados correctamente!</span>
          </div>
        </div>
      )}

      <div ref={reportRef} className="bg-[#f4f7fa] pb-10">
        {/* Barra superior de sesión autorizada */}
        {authenticatedUser && (
          <div className="max-w-6xl mx-auto px-4 pt-4 flex justify-end items-center print:hidden">
            <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-sm border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Usuario: <span className="text-gray-900 font-extrabold">{authenticatedUser}</span>
              </span>
              <div className="w-[1px] h-3.5 bg-gray-200"></div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[10px] text-gray-400 hover:text-red-600 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
                <span>Salir</span>
              </button>
            </div>
          </div>
        )}

        <header className="pt-6 pb-6 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Gestión de Calidad Educativa</p>
          <h1 className="text-4xl font-black text-[#222222] tracking-tighter">
            CHECK LIST <span className="relative inline-block">PLANIFICADOR<span className="absolute bottom-0 left-0 w-full h-1 bg-[#4483eb]"></span></span> ACADÉMICO
          </h1>
        </header>

        <main className="max-w-6xl mx-auto px-4 space-y-6">
          <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 border border-white print:hidden">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">BUSCADOR DE CARGA DOCENTE</label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full pl-12 pr-4 py-4 bg-[#f8fafc] border-2 border-blue-500 rounded-2xl outline-none text-gray-700 font-medium placeholder-gray-400 shadow-sm"
                placeholder="Escriba nombre del docente o unidad didáctica..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <i className="fa-solid fa-magnifying-glass text-gray-300"></i>
              </div>
              {filteredTeachers.length > 0 && searchTerm !== selectedTeacher?.docente && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar">
                  {filteredTeachers.map((t, idx) => (
                    <li 
                      key={idx} 
                      className="p-4 hover:bg-[#f8f9fb] cursor-pointer border-b border-gray-50 flex justify-between items-start transition-colors"
                      onClick={() => handleSelectTeacher(t)}
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-[13px] text-gray-800 uppercase leading-tight">{t.docente}</p>
                        <p className="text-[12px] text-gray-400 font-medium">{t.unidadDidactica}</p>
                      </div>
                      <div className="text-blue-600 font-black text-[13px] tracking-tight ml-4">
                        {t.seccion}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-8 border border-white grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Docente</label>
                <input readOnly value={selectedTeacher?.docente || ''} className="w-full bg-[#f4f6f8] rounded-xl px-4 py-3 text-sm font-bold text-gray-700 h-12" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Programa</label>
                <input readOnly value={selectedTeacher?.programa || ''} className="w-full bg-[#f4f6f8] rounded-xl px-4 py-3 text-sm font-bold text-gray-700 h-12" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Unidad Didáctica</label>
                <input readOnly value={selectedTeacher?.unidadDidactica || ''} className="w-full bg-[#f4f6f8] rounded-xl px-4 py-3 text-sm font-bold text-gray-700 h-12" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Sección</label>
                <input readOnly value={selectedTeacher?.seccion || ''} className="w-full bg-[#f4f6f8] rounded-xl px-4 py-3 text-sm font-bold text-gray-700 h-12" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Modalidad</label>
                <input readOnly value={selectedTeacher?.modalidad || ''} className="w-full bg-[#f4f6f8] rounded-xl px-4 py-3 text-sm font-bold text-gray-700 h-12" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Responsable G.D.</label>
                <input readOnly value={selectedTeacher?.responsable || ''} className="w-full bg-[#f4f6f8] rounded-xl px-4 py-3 text-sm font-bold text-gray-700 h-12" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Fecha Monitoreo</label>
                <input type="date" value={fechaMonitoreo} onChange={e => setFechaMonitoreo(e.target.value)} className="w-full bg-[#f4f6f8] rounded-xl px-4 py-3 text-sm font-bold text-gray-700 h-12 border-none outline-none" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-[#fcfdfe] rounded-2xl border border-gray-100 p-4 flex flex-col items-center justify-center flex-1">
                 <p className="text-[10px] font-bold text-blue-500 uppercase mb-1 tracking-widest">Puntaje Total</p>
                 <p className="text-6xl font-black text-gray-800 leading-none">{totalPoints}</p>
              </div>
              <div className="bg-[#ffcc00] rounded-2xl p-4 flex flex-col items-center justify-center flex-1 shadow-inner overflow-hidden">
                 <p className="text-[9px] font-black uppercase text-blue-900 mb-2 text-center leading-tight">Nota Final Uso Aula</p>
                 <p className="text-5xl font-black text-blue-700 leading-none drop-shadow-sm">{notaFinal}</p>
              </div>
            </div>
          </section>

          <div className="bg-[#333333] rounded-2xl flex overflow-hidden shadow-xl border-4 border-[#333333]">
             <div className="bg-[#4483eb] text-white px-8 py-4 font-black text-xs uppercase tracking-widest flex items-center">
               Enlace Carpeta Docente
             </div>
             <input 
                type="text" 
                className="flex-1 bg-transparent text-white/90 px-6 py-4 outline-none font-medium italic text-sm placeholder-gray-500" 
                placeholder="Pegue aquí la URL de la carpeta docente (OBLIGATORIO)..."
                value={enlaceAula}
                onChange={e => setEnlaceAula(e.target.value)}
             />
          </div>

          <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#4483eb] text-white">
                  <th className="p-5 text-[11px] font-black uppercase w-20 text-center">N°</th>
                  <th className="p-5 text-[11px] font-black uppercase">Criterios de Evaluación</th>
                  <th className="p-5 text-[11px] font-black uppercase text-center w-36">SÍ (2 PTS)</th>
                  <th className="p-5 text-[11px] font-black uppercase text-center w-28">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((criterion, idx) => (
                  <tr 
                    key={criterion.id} 
                    onClick={() => toggleCriterion(criterion.id)}
                    className="border-b last:border-0 hover:bg-[#fbfcfe] transition-colors group cursor-pointer"
                  >
                    <td className="p-6 text-center font-bold text-gray-200 text-sm group-hover:text-[#4483eb]/30 transition-colors">{idx + 1}</td>
                    <td className="p-6">
                      <p className="font-bold text-[#4483eb] leading-tight text-lg mb-1 group-hover:translate-x-1 transition-transform">{criterion.label}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{criterion.description}</p>
                    </td>
                    <td className="p-6 text-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto transition-all duration-200 ${
                          checklist[criterion.id] 
                            ? 'bg-[#4483eb] text-white shadow-lg scale-110' 
                            : 'bg-white border-2 border-gray-100 text-gray-100 group-hover:border-[#4483eb]/30'
                        }`}>
                        <i className={`fa-solid fa-check text-2xl ${checklist[criterion.id] ? 'opacity-100' : 'opacity-20'}`}></i>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                       <span className={`text-4xl font-black transition-all ${checklist[criterion.id] ? 'text-[#4483eb]' : 'text-gray-50'}`}>
                         {checklist[criterion.id] ? '2' : '0'}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {auditFeedback && (
            <div className="bg-white border-2 border-[#4483eb]/10 p-8 rounded-[2rem] shadow-sm animate-fade-in print:hidden">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-[#2563eb] rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-blue-200">
                  <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
                </div>
                <div>
                  <h3 className="font-black text-[#1e293b] text-2xl tracking-tight leading-none uppercase">Análisis Gemini IA</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Recomendaciones para el análisis de mejora</p>
                </div>
              </div>
              <div className="bg-white p-2 rounded-2xl">
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                  <ReactMarkdown>{auditFeedback}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <main className="max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center gap-4 pt-10 print:hidden">
          <button 
            type="button"
            onClick={handleIAAudit}
            disabled={isAuditing}
            className={`flex items-center gap-3 px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
              isAuditing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#4483eb] text-white hover:bg-[#3572d1]'
            }`}
          >
            {isAuditing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : null}
            AUDITORÍA IA
          </button>

          <button 
            type="button"
            onClick={handleExportExcel}
            disabled={isSaving}
            className={`flex items-center gap-3 bg-[#4483eb] text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#3572d1] transition-all active:scale-95 ${
              isSaving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : null}
            GUARDAR EN EXCEL
          </button>

          <button 
            id="export-pdf-btn"
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-3 bg-[#1d2636] text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-[#151c28] transition-all active:scale-95 min-w-[180px] justify-center"
          >
            <i className="fa-solid fa-file-arrow-down text-base"></i>
            REPORTE PDF
          </button>
        </div>
      </main>

      <footer className="mt-20 text-center opacity-40 print:hidden">
         <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
           Sistema de Calidad Académica • Instituto Continental
         </p>
      </footer>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-in {
          0% { transform: translate(-50%, -20px); opacity: 0; }
          70% { transform: translate(-50%, 10px); opacity: 1; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
        .prose p {
          margin-bottom: 1rem;
        }
        .prose strong {
          color: #1e293b;
          font-weight: 800;
        }
        .prose ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose li {
          margin-bottom: 0.5rem;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2c2c2c;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #000;
        }
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
          main { margin: 0; padding: 0; max-width: 100%; }
          .shadow-xl, .shadow-[0_4px_20px_rgba(0,0,0,0.03)] { shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
