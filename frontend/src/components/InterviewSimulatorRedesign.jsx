import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, BrainCircuit, CheckCircle2, ChevronRight, X, XCircle } from "lucide-react";

export function InterviewSimulatorRedesign({ questions, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  if (!questions?.length) return null;
  const currentQuestion = questions[currentIndex];
  const selectOption = (option) => {
    if (selected) return;
    setSelected(option);
    if (option === currentQuestion.a) setScore((prev) => prev + 1);
  };
  const next = () => currentIndex + 1 < questions.length ? (setCurrentIndex((prev) => prev + 1), setSelected(null)) : setFinished(true);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="floating-panel w-full max-w-3xl rounded-[32px]">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--accent-soft)] px-6 py-5">
          <div>
            <div className="section-label"><BrainCircuit size={14} /> Mock interview</div>
            <div className="mt-3 font-display text-2xl font-semibold text-[var(--text-primary)]">
              {finished ? "Interview complete" : `Question ${currentIndex + 1} of ${questions.length}`}
            </div>
          </div>
          <button type="button" onClick={onClose} className="secondary-btn"><X size={18} /></button>
        </div>

        <div className="px-6 py-8">
          {finished ? (
            <div className="text-center">
              <Award size={60} className="mx-auto text-[var(--accent)]" />
              <h3 className="mt-6 font-display text-3xl font-semibold text-[var(--text-primary)]">Interview complete</h3>
              <p className="mt-3 text-base text-[var(--text-secondary)]">You scored {score} out of {questions.length}.</p>
              <button type="button" onClick={onClose} className="primary-btn mx-auto mt-8">Back to recommendations</button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                <h3 className="text-2xl font-semibold leading-relaxed text-[var(--text-primary)]">{currentQuestion.q}</h3>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {currentQuestion.options.map((option, index) => {
                    let state = "quiz-option";
                    let icon = null;
                    if (selected) {
                      if (option === currentQuestion.a) {
                        state += " quiz-option--correct";
                        icon = <CheckCircle2 size={18} />;
                      } else if (option === selected) {
                        state += " quiz-option--wrong";
                        icon = <XCircle size={18} />;
                      } else {
                        state += " quiz-option--muted";
                      }
                    }
                    return <button key={`${option}-${index}`} type="button" onClick={() => selectOption(option)} disabled={Boolean(selected)} className={state}><span>{option}</span>{icon}</button>;
                  })}
                </div>
                {selected && <div className="mt-8 flex justify-end"><button type="button" onClick={next} className="primary-btn">{currentIndex + 1 === questions.length ? "Finish interview" : "Next question"}<ChevronRight size={18} /></button></div>}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
