import { validateAIQuestions } from '../worker/src/ai.js';

let pass = 0, fail = 0;
function t(name, cond) { cond ? pass++ : (fail++, console.log('FAIL:', name)); }

// 1. Valid mixed quiz
const good = { questions: [
  { type: 'mcq', text: 'Solve 2x+3=11', options: [{text:'x=4',is_correct:true},{text:'x=5',is_correct:false},{text:'x=3',is_correct:false},{text:'x=6',is_correct:false}], explanation: 'Subtract 3, divide by 2.', marks: 2, difficulty: 'medium' },
  { type: 'tf', text: '2x=8 means x=4', correct_bool: true, explanation: 'Divide both sides by 2.', marks: 1, difficulty: 'easy' },
  { type: 'short', text: 'What is 7*8?', accepted: ['56', 'fifty-six'], explanation: '7 times 8 is 56.', marks: 1, difficulty: 'easy' },
  { type: 'fill', text: 'The capital of France is _____.', accepted: ['Paris'], explanation: 'Paris is the capital.', marks: 1, difficulty: 'easy' },
  { type: 'matching', text: 'Match the term', pairs: [{left:'2x',right:'variable term'},{left:'5',right:'constant'},{left:'+',right:'operator'}], explanation: 'Terms.', marks: 3, difficulty: 'medium' },
]};
let r = validateAIQuestions(good, ['mcq','tf','short','fill','matching']);
t('valid mixed quiz passes', r.ok && r.questions.length === 5);
t('tf converted to options', r.ok && r.questions[1].options.length === 2 && r.questions[1].options[0].is_correct === true);

// 2. MCQ with two correct -> reject
r = validateAIQuestions({ questions: [{ type:'mcq', text:'Q', options:[{text:'a',is_correct:true},{text:'b',is_correct:true}], explanation:'e' }] });
t('mcq two correct rejected', !r.ok);

// 3. MCQ with no correct -> reject
r = validateAIQuestions({ questions: [{ type:'mcq', text:'Q', options:[{text:'a',is_correct:false},{text:'b',is_correct:false}], explanation:'e' }] });
t('mcq zero correct rejected', !r.ok);

// 4. fill without blank -> reject
r = validateAIQuestions({ questions: [{ type:'fill', text:'No blank here', accepted:['x'], explanation:'e' }] });
t('fill without _____ rejected', !r.ok);

// 5. short with no accepted -> reject
r = validateAIQuestions({ questions: [{ type:'short', text:'Q?', accepted:[], explanation:'e' }] });
t('short no accepted rejected', !r.ok);

// 6. matching with duplicate rights -> reject
r = validateAIQuestions({ questions: [{ type:'matching', text:'M', pairs:[{left:'a',right:'x'},{left:'b',right:'x'},{left:'c',right:'y'}], explanation:'e' }] });
t('matching dup rights rejected', !r.ok);

// 7. unexpected type filtered
r = validateAIQuestions(good, ['mcq']);
t('type allowlist enforced', !r.ok);

// 8. empty text rejected
r = validateAIQuestions({ questions: [{ type:'short', text:'  ', accepted:['x'], explanation:'e' }] });
t('empty text rejected', !r.ok);

// 9. garbage input
t('null rejected', !validateAIQuestions(null).ok);
t('string rejected', !validateAIQuestions('hello').ok);
t('empty questions rejected', !validateAIQuestions({questions:[]}).ok);

// 10. tf missing correct_bool
r = validateAIQuestions({ questions: [{ type:'tf', text:'Q?', explanation:'e' }] });
t('tf without correct_bool rejected', !r.ok);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
