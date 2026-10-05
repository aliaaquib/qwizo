import { gradeSubmission, validateQuizForPublish, validateQuestionForPublish } from '../worker/src/grade.js';

let pass = 0, fail = 0;
function t(name, cond) { cond ? pass++ : (fail++, console.log('FAIL:', name)); }

const snap = { questions: [
  { id:'q1', type:'mcq', text:'2x+3=11?', marks:2, options:[{id:'o1',text:'x=4',is_correct:true},{id:'o2',text:'x=5',is_correct:false}] },
  { id:'q2', type:'tf', text:'x=4?', marks:1, options:[{id:'t',text:'True',is_correct:true},{id:'f',text:'False',is_correct:false}] },
  { id:'q3', type:'short', text:'7*8?', marks:1, case_sensitive:false, accepted:[{text:'56'}] },
  { id:'q4', type:'fill', text:'Capital of France is _____.', marks:1, case_sensitive:false, accepted:[{text:'Paris'}] },
  { id:'q5', type:'matching', text:'Match', marks:4, pairs:[{id:'p1',left:'2x',right:'term',right_id:'p1'},{id:'p2',left:'5',right:'const',right_id:'p2'}] },
  { id:'q6', type:'short', text:'Name?', marks:1, case_sensitive:true, accepted:[{text:'Aiza'}] },
]};

// all correct (with whitespace/case forgiveness)
let r = gradeSubmission(snap, {
  q1:{option_id:'o1'}, q2:{value:true}, q3:{text:'  56 '}, q4:{text:'paris'},
  q5:{matches:{p1:'p1',p2:'p2'}}, q6:{text:'Aiza'},
});
t('all correct scores full', r.score === 10 && r.percentage === 100 && r.correct_count === 6);

// case sensitivity enforced
r = gradeSubmission(snap, { q6:{text:'aiza'} });
t('case-sensitive rejects wrong case', r.graded.find(g=>g.question_id==='q6').is_correct === false);

// partial matching credit
r = gradeSubmission(snap, { q5:{matches:{p1:'p1',p2:'p1'}} });
t('matching partial credit', r.graded.find(g=>g.question_id==='q5').marks_awarded === 2);

// wrong answers score zero
r = gradeSubmission(snap, { q1:{option_id:'o2'}, q2:{value:false}, q3:{text:'55'}, q4:{text:'London'}, q5:{matches:{p1:'p2',p2:'p1'}} });
t('all wrong scores zero', r.score === 0 && r.incorrect_count === 6);

// unanswered counts as incorrect, not crash
r = gradeSubmission(snap, {});
t('empty answers safe', r.score === 0 && r.max_score === 10 && r.incorrect_count === 6);

// unknown option id is wrong, not crash
r = gradeSubmission(snap, { q1:{option_id:'nope'} });
t('unknown option id safe', r.graded.find(g=>g.question_id==='q1').is_correct === false);

// publish validation
const quiz = { title:'T' };
t('empty quiz rejected', validateQuizForPublish(quiz, []).length > 0);
t('untitled rejected', validateQuizForPublish({title:' '}, [{type:'tf',text:'Q?',marks:1,options:[{text:'True',is_correct:true},{text:'False',is_correct:false}]}]).length > 0);
const goodQ = [
  {type:'mcq',text:'Q?',marks:1,options:[{text:'a',is_correct:true},{text:'b',is_correct:false}]},
  {type:'tf',text:'Q?',marks:1,options:[{text:'True',is_correct:true},{text:'False',is_correct:false}]},
  {type:'short',text:'Q?',marks:1,accepted:[{text:'x'}]},
  {type:'fill',text:'A _____ B',marks:1,accepted:[{text:'x'}]},
  {type:'matching',text:'Q?',marks:2,pairs:[{left_text:'a',right_text:'1'},{left_text:'b',right_text:'2'}]},
];
t('valid quiz passes', validateQuizForPublish(quiz, goodQ).length === 0);
t('mcq no correct caught', validateQuestionForPublish({type:'mcq',text:'Q',marks:1,options:[{text:'a',is_correct:false}]}).length > 0);
t('fill no blank caught', validateQuestionForPublish({type:'fill',text:'no blank',marks:1,accepted:[{text:'x'}]}).length > 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
