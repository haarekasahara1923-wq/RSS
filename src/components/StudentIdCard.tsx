import React, { useState } from 'react';
import Script from 'next/script';

export function StudentIdCard({ student, school }: any) {
  const [isPdfReady, setIsPdfReady] = useState(false);

  const downloadPDF = () => {
    const element = document.getElementById(`id-card-${student.id}`);
    if (!element) return;
    const opt = {
      margin: 0,
      filename: `${student.fullName}_ID_Card.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'in', format: [2.125, 3.375], orientation: 'portrait' } // CR-80 standard ID size
    };
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="lazyOnload" onLoad={() => setIsPdfReady(true)} />
      
      {/* ID Card Display */}
      <div 
        id={`id-card-${student.id}`} 
        style={{ 
          width: '2.125in', 
          height: '3.375in', 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'sans-serif',
          color: '#0f172a'
        }}
      >
        {/* Header Branding */}
        <div style={{ 
          background: school.themeColor || '#6366f1', 
          color: 'white', 
          padding: '12px 8px', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          {school.logo ? (
            <img src={school.logo} alt="Logo" style={{ height: '30px', objectFit: 'contain' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ fontSize: '18px' }}>🏫</div>
          )}
          <div style={{ fontSize: '11px', fontWeight: '800', lineHeight: 1.1 }}>{school.name}</div>
        </div>

        {/* Student Info */}
        <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '70px', 
            height: '70px', 
            borderRadius: '8px', 
            background: '#e2e8f0', 
            overflow: 'hidden',
            border: `2px solid ${school.themeColor || '#6366f1'}`
          }}>
            {student.photo ? (
              <img src={student.photo} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🧑‍🎓</div>
            )}
          </div>
          
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: school.themeColor || '#6366f1', marginBottom: '2px' }}>{student.fullName}</div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>{student.course?.name} - {student.batch?.name}</div>
          </div>

          <div style={{ width: '100%', marginTop: 'auto', display: 'grid', gridTemplateColumns: '40px 1fr', gap: '4px', fontSize: '9px' }}>
            <div style={{ fontWeight: '700', color: '#64748b' }}>F.Name:</div>
            <div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.fatherName || 'N/A'}</div>
            
            <div style={{ fontWeight: '700', color: '#64748b' }}>DOB:</div>
            <div style={{ fontWeight: '600' }}>{student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : 'N/A'}</div>
            
            <div style={{ fontWeight: '700', color: '#64748b' }}>ID NO:</div>
            <div style={{ fontWeight: '600' }}>{student.studentId || student.id.slice(0, 8).toUpperCase()}</div>
            
            <div style={{ fontWeight: '700', color: '#64748b' }}>Phone:</div>
            <div style={{ fontWeight: '600' }}>{student.phone}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '6px', textAlign: 'center', fontSize: '7px', color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
          {school.address || 'Valid for current academic year only.'}
        </div>
      </div>

      <button
        onClick={downloadPDF}
        style={{
          background: school.themeColor || '#6366f1',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '13px',
          cursor: 'pointer',
          opacity: isPdfReady ? 1 : 0.6
        }}
      >
        🖨️ Download ID Card
      </button>
    </div>
  );
}
