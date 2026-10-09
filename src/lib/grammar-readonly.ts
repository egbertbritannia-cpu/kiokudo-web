import { stagingCoreRead } from './core-staging-server';

interface GrammarStats {
 totalLessons:number; totalPatterns:number; totalCards:number;
 dueCards:number;newCards:number;reviewCards:number;
}
type Lesson=Record<string,any>;
interface IndexResponse {
 lessons:Lesson[]; stats:GrammarStats; patterns:any[];
}

/**
 * Read-only facade preserving the existing Grammar server-page interface.
 * No Drizzle/Turso driver or DB credentials are loaded in Kiokudo Web.
 */
export const grammarRepository={
  async getAllLessonsWithStats(){
    const result=await stagingCoreRead<IndexResponse>('/api/v1/grammar');
    return {lessons:result.lessons,stats:result.stats};
  },
  async getAllPatternsSummary(){
    return (await stagingCoreRead<IndexResponse>('/api/v1/grammar')).patterns;
  },
  async getLessonById(id:string):Promise<Lesson|null>{
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))return null;
    try{return await stagingCoreRead<Lesson>('/api/v1/grammar/'+encodeURIComponent(id));}
    catch(e){if(e instanceof Error && e.message==='lesson_not_found')return null;throw e;}
  },
};
