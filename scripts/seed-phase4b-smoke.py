#!/usr/bin/env python3
"""CI ONLY: add disposable Grammar/IELTS fixtures to a fresh 316-card SQLite rehearsal.

Never use on actual Turso or exported user databases. Refuses any other basename
or a DB that does not contain the public CI/local-only deployment marker.
"""
import sqlite3
import sys
from pathlib import Path

MARKER="kiokudo-local-json-fixture-not-production-v1"

def main():
    if len(sys.argv)!=2:raise SystemExit("usage: seed-phase4b-smoke.py staging-smoke.db")
    db=Path(sys.argv[1]).resolve()
    if db.name!="staging-smoke.db" or not db.is_file():
        raise SystemExit("Refusing non-CI fixture database")
    with sqlite3.connect(str(db)) as cx:
        marker=cx.execute(
            "SELECT marker FROM kiokudo_deployment_identity WHERE environment='staging'"
        ).fetchone()
        if marker!=(MARKER,):raise SystemExit("Refusing database without CI-only staging marker")
        existing=cx.execute("SELECT COUNT(*) FROM cards").fetchone()[0]
        if existing!=316:raise SystemExit("Refusing database without exactly 316 fresh fixture cards")
        cx.executescript("""
          CREATE TABLE grammar_lessons (
            id TEXT PRIMARY KEY,lesson_number INTEGER NOT NULL,title_ja TEXT NOT NULL,title_vi TEXT NOT NULL,
            theme_ja TEXT,theme_vi TEXT,pattern_range TEXT NOT NULL,pattern_count INTEGER NOT NULL,
            accent_color TEXT NOT NULL,wagara TEXT,inkan_char TEXT,description TEXT NOT NULL,
            sort_order INTEGER NOT NULL,created_at INTEGER NOT NULL);
          CREATE TABLE grammar_patterns (
            id TEXT PRIMARY KEY,lesson_id TEXT NOT NULL,pattern_number INTEGER NOT NULL,
            jlpt_level TEXT NOT NULL,difficulty_score INTEGER NOT NULL,pattern_template TEXT NOT NULL,
            structure_slots TEXT NOT NULL,meaning_vi TEXT NOT NULL,meaning_ja TEXT,usage_note TEXT,
            examples TEXT NOT NULL,verb_types TEXT,related_pattern_ids TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
          CREATE TABLE grammar_exercises (
            id TEXT PRIMARY KEY,pattern_id TEXT NOT NULL,exercise_type TEXT NOT NULL,difficulty INTEGER NOT NULL,
            sentence_with_cloze TEXT,question TEXT,option_a TEXT,option_b TEXT,option_c TEXT,option_d TEXT,
            correct_option TEXT,prompt_text TEXT,answer_text TEXT NOT NULL,alternate_answers TEXT,
            explanation_vi TEXT,explanation_ja TEXT,source_ref TEXT,sort_order INTEGER NOT NULL,created_at INTEGER NOT NULL);
          CREATE TABLE eng_materials (
            id TEXT PRIMARY KEY,type TEXT NOT NULL,title TEXT NOT NULL,publisher TEXT,year_published INTEGER,
            total_tests INTEGER,test_type TEXT NOT NULL,created_at INTEGER NOT NULL);
          CREATE TABLE ielts_sessions (
            id TEXT PRIMARY KEY,material_id TEXT,test_number TEXT,test_type TEXT NOT NULL,
            section TEXT NOT NULL,start_time INTEGER NOT NULL,end_time INTEGER,total_duration_seconds INTEGER,
            raw_score INTEGER,max_score INTEGER,current_score_band REAL,target_score_band REAL,
            session_status TEXT NOT NULL,created_at INTEGER NOT NULL);
          CREATE TABLE ielts_practice_logs (
            id TEXT PRIMARY KEY,session_id TEXT,question_number INTEGER NOT NULL,question_type TEXT,
            user_answer TEXT,correct_answer TEXT,is_correct INTEGER,time_spent_seconds INTEGER,
            submission_text TEXT,audio_url TEXT,criteria_scores TEXT,notes TEXT,created_at INTEGER NOT NULL);
          CREATE TABLE ielts_mistakes (
            id TEXT PRIMARY KEY,log_id TEXT,session_id TEXT,mistake_category TEXT,
            root_cause_analysis TEXT,action_plan_for_improvement TEXT,is_resolved INTEGER,created_at INTEGER NOT NULL);
          CREATE TABLE eng_vocab (
            id TEXT PRIMARY KEY,material_id TEXT,session_id TEXT,log_id TEXT,word TEXT NOT NULL,
            part_of_speech TEXT,phonetic TEXT,primary_meaning TEXT,context_sentence TEXT,synonyms TEXT,tags TEXT,
            fsrs_stability REAL NOT NULL,fsrs_difficulty REAL NOT NULL,fsrs_due INTEGER,
            fsrs_state TEXT NOT NULL,reps INTEGER NOT NULL,lapses INTEGER NOT NULL,
            elapsed_days INTEGER NOT NULL,scheduled_days INTEGER NOT NULL,last_review INTEGER,
            created_at INTEGER NOT NULL,updated_at INTEGER);
          INSERT INTO grammar_lessons
            (id,lesson_number,title_ja,title_vi,pattern_range,pattern_count,accent_color,description,sort_order,created_at)
            VALUES('ci_lesson8',8,'CI 第8課','CI Bài 8','72',1,'#1B4268','CI-ONLY GRAMMAR FIXTURE',0,1800000000);
          INSERT INTO grammar_patterns
            (id,lesson_id,pattern_number,jlpt_level,difficulty_score,pattern_template,
             structure_slots,meaning_vi,examples,created_at,updated_at)
            VALUES('ci_pattern','ci_lesson8',72,'N5',1,'N は N です','[]','CI-only pattern','[]',1800000000,1800000000);
          INSERT INTO grammar_exercises
            (id,pattern_id,exercise_type,difficulty,answer_text,alternate_answers,sort_order,created_at)
            VALUES('ci_exercise','ci_pattern','cloze',1,'です','["desu"]',0,1800000000);
          INSERT INTO eng_materials (id,type,title,test_type,created_at)
            VALUES('ci_book','book','CI-only Cambridge sample','academic',1800000000);
          INSERT INTO ielts_sessions
            (id,material_id,test_number,test_type,section,start_time,raw_score,max_score,
             current_score_band,session_status,created_at)
            VALUES('ci_session','ci_book','CI Test 1','academic','Reading',1800000000000,32,40,7.5,'completed',1800000000);
        """)
        cx.commit()
        assert cx.execute("SELECT COUNT(*) FROM review_logs").fetchone()[0]==0
        assert cx.execute("PRAGMA integrity_check").fetchone()[0]=="ok"
        print("PASS CI ONLY: Grammar + IELTS fixture rows inserted into disposable staging-smoke.db")

if __name__=="__main__":main()
