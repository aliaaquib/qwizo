"""Qwizo teacher-flow QA via CDP. Reports PASS/FAIL per step."""
import sys, time, json
sys.path.insert(0, "/home/hatch/workspace/qwizo/test")
from cdp_driver import CDP

B = "http://127.0.0.1:18787"
results = []
def step(name, fn):
    try:
        fn()
        results.append(("PASS", name, ""))
        print(f"PASS: {name}")
    except Exception as e:
        results.append(("FAIL", name, str(e)[:300]))
        print(f"FAIL: {name} :: {str(e)[:300]}")

def assert_eq(a, b, msg=""):
    if a != b: raise AssertionError(f"{msg} expected {b!r}, got {a!r}")
def assert_in(a, b, msg=""):
    if a not in b: raise AssertionError(f"{msg} {a!r} not in {str(b)[:200]!r}")

d = CDP()
try:
    # 1. app redirects to login
    def s1():
        d.nav(B + "/app")
        time.sleep(1.5)
        assert_in("login", d.eval("location.hash"), "hash")
        assert d.eval("!!document.querySelector('#email')"), "email field missing"
    step("app redirects to login", s1)

    # 2. signup
    def s2():
        d.eval("""document.querySelector('#name').value='QA Teacher';
                  document.querySelector('#email').value='qateacher@qwizo.test';
                  document.querySelector('#pw').value='testpassword123';
                  document.querySelector('#go').click();""")
        time.sleep(2.5)
        assert_in("#/", d.eval("location.hash"), "hash after signup")
        assert "QA Teacher" in d.eval("document.body.innerText"), "dashboard missing user"
    step("signup -> dashboard", s2)
    d.screenshot("/tmp/qa-dashboard.png")

    # 3. new blank quiz
    def s3():
        d.eval("location.hash='#/quizzes/new'"); time.sleep(1.5)
        # click "Blank quiz"
        d.eval("document.querySelector('#goManual').click()"); time.sleep(2.5)
        assert_in("/quizzes/", d.eval("location.hash"), "not in editor")
        assert d.eval("!!document.querySelector('#edTitle')"), "title input missing"
    step("create blank quiz -> editor", s3)

    # 4. edit title + meta
    def s4():
        d.eval("""const t=document.querySelector('#edTitle'); t.value='QA Fractions Quiz';
                  t.dispatchEvent(new Event('input',{bubbles:true}));
                  const s=document.querySelector('#edSubject'); s.value='Mathematics';
                  s.dispatchEvent(new Event('input',{bubbles:true}));""")
        time.sleep(2.5)  # autosave debounce 900ms
        st = d.eval("document.querySelector('#saveState').textContent")
        assert_in("Saved", st, "save state: " + st)
    step("edit title/subject + autosave", s4)

    # 5. add MCQ
    def s5():
        d.eval("document.querySelector('[data-add=mcq]').click()"); time.sleep(1.5)
        n = d.eval("document.querySelectorAll('.q-block').length")
        assert_eq(n, 1, "question blocks")
        d.eval("""const b=document.querySelector('.q-block');
                  const t=b.querySelector('[data-f=text]'); t.value='What is 1/2 + 1/4?';
                  t.dispatchEvent(new Event('input',{bubbles:true}));""")
        opts = d.eval("document.querySelectorAll('.q-block [data-opt]').length")
        assert_eq(opts, 2, "default options")
        # fill options: first correct
        d.eval("""const b=document.querySelector('.q-block');
                  const ins=b.querySelectorAll('[data-opt]');
                  ins[0].value='3/4'; ins[0].dispatchEvent(new Event('input',{bubbles:true}));
                  ins[1].value='1/4'; ins[1].dispatchEvent(new Event('input',{bubbles:true}));
                  b.querySelector('[data-optadd]').click();""")
        time.sleep(1.0)
        d.eval("""const b=document.querySelector('.q-block');
                  const ins=b.querySelectorAll('[data-opt]');
                  ins[2].value='1/2'; ins[2].dispatchEvent(new Event('input',{bubbles:true}));
                  // mark first correct
                  b.querySelectorAll('[data-pick]')[0].click();""")
        time.sleep(2.5)
        st = d.eval("document.querySelector('#saveState').textContent")
        assert_in("Saved", st, "save state after mcq: " + st)
    step("add MCQ with 3 options, mark correct", s5)
    d.screenshot("/tmp/qa-editor.png")

    # 6. add TF + short
    def s6():
        d.eval("document.querySelector('[data-add=tf]').click()"); time.sleep(1.2)
        d.eval("document.querySelector('[data-add=short]').click()"); time.sleep(1.2)
        n = d.eval("document.querySelectorAll('.q-block').length")
        assert_eq(n, 3, "blocks")
        d.eval("""const bs=document.querySelectorAll('.q-block');
                  const tf=bs[1]; tf.querySelector('[data-f=text]').value='1/2 is greater than 1/3.';
                  tf.querySelector('[data-f=text]').dispatchEvent(new Event('input',{bubbles:true}));
                  tf.querySelector('[data-tfval=true]').click();
                  const sh=bs[2]; sh.querySelector('[data-f=text]').value='What is 2 + 2?';
                  sh.querySelector('[data-f=text]').dispatchEvent(new Event('input',{bubbles:true}));
                  sh.querySelector('[data-accid]').value='4';
                  sh.querySelector('[data-accid]').dispatchEvent(new Event('input',{bubbles:true}));""")
        time.sleep(2.5)
    step("add TF + short answer", s6)

    # 7. preview
    def s7():
        d.eval("location.hash=d.eval? '' : ''");  # noop
        h = d.eval("location.hash")
        qid = h.split('/')[2]
        d.eval(f"location.hash='#/quizzes/{qid}/preview'"); time.sleep(2)
        txt = d.eval("document.body.innerText")
        assert_in("1/2 + 1/4", txt, "preview q1")
        assert_in("1/2 is greater than 1/3", txt, "preview q2")
        d.screenshot("/tmp/qa-preview.png")
        d.eval(f"location.hash='#/quizzes/{qid}'"); time.sleep(2)
    step("preview renders questions", s7)

    # 8. publish -> share
    def s8():
        d.eval("document.querySelector('#pubBtn').click()"); time.sleep(3)
        assert_in("/share", d.eval("location.hash"), "not on share page: " + d.eval("location.hash"))
        code = d.eval("document.querySelector('.code-big').textContent.trim()")
        assert len(code) == 9 and code[4] == '-', "bad code: " + code
        assert d.eval("!!document.querySelector('#qrBox svg')"), "QR missing"
        d.screenshot("/tmp/qa-share.png")
        d.eval("window.__code = document.querySelector('.code-big').textContent.trim()")
    step("publish -> share page with code + QR", s8)

    # 9. student flow
    def s9():
        code = d.eval("window.__code")
        d.nav(B + "/q/" + code); time.sleep(2)
        assert_in("QA Fractions Quiz", d.eval("document.body.innerText"), "intro")
        d.eval("""document.querySelector('#stuName').value='QA Student';
                  document.querySelector('#startBtn').click();""")
        time.sleep(2.5)
        # Q1: click first option (3/4)
        d.eval("document.querySelectorAll('.opt')[0].click()")
        d.eval("document.querySelector('#nextBtn').click()"); time.sleep(1)
        # Q2: True
        d.eval("document.querySelector('[data-tf=true]').click()")
        d.eval("document.querySelector('#nextBtn').click()"); time.sleep(1)
        # Q3: type 4
        d.eval("""document.querySelector('#textAns').value='4';
                  document.querySelector('#nextBtn').click();""")
        time.sleep(1.5)
        assert_in("Submit quiz?", d.eval("document.body.innerText"), "confirm dialog")
        d.eval("document.querySelector('#doSubmit').click()"); time.sleep(3)
        txt = d.eval("document.body.innerText")
        assert_in("100%", txt, "score: " + txt[:200])
        d.screenshot("/tmp/qa-result.png")
    step("student takes quiz, scores 100%", s9)

    # 10. teacher results
    def s10():
        h = d.eval("location.hash")  # still on take page; navigate via app
        d.nav(B + "/app#/quizzes"); time.sleep(2.5)
        # open the quiz row -> results
        d.eval("""const row=document.querySelector('.quiz-row');
                  row.querySelector('a.icon-btn[title=Results]').click();""")
        time.sleep(2.5)
        txt = d.eval("document.body.innerText")
        assert_in("QA Student", txt, "submission: " + txt[:300])
        assert_in("100%", txt, "percentage")
        d.screenshot("/tmp/qa-results.png")
    step("teacher sees submission in results", s10)

    # JS errors
    d.drain(1.5)
    if d.errors:
        print("\n--- JS errors captured ---")
        for e in d.errors[:10]: print(e)
        results.append(("FAIL", "no JS errors", f"{len(d.errors)} errors"))
    else:
        results.append(("PASS", "no JS errors", ""))
        print("PASS: no JS errors")

finally:
    d.close()

fails = [r for r in results if r[0] == "FAIL"]
print(f"\n===== {len(results)-len(fails)}/{len(results)} passed =====")
sys.exit(1 if fails else 0)
