    
    import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
    /* =====================================================
    EXAMSHUFFLE - MAIN JAVASCRIPT
    PART 1
    ===================================================== */


    /* =====================================================
    GLOBAL STATE
    ===================================================== */

    let currentUser = null;

    let currentLoginRole = "candidate";

    let currentSection = "home";

    let tests = [];

    let candidates = [];

    let submissions = [];

    let activityLogs = [];

    let activeTest = null;

    let currentQuestionIndex = 0;

    let userAnswers = {};

    let remainingSeconds = 0;

    let timerInterval = null;

    let cameraStream = null;

    let violationCount = 0;

    let testStarted = false;


    /* =====================================================
    HELPER FUNCTION
    ===================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    /* =====================================================
    PAGE / SECTION MANAGEMENT
    ===================================================== */

    function showSection(sectionId) {

        const sections = document.querySelectorAll(".section, .page-section");

        sections.forEach(section => {
            section.classList.remove("active");
        });


        const target = $(sectionId);

        if (!target) {
            console.warn("Section not found:", sectionId);
            return;
        }


        target.classList.add("active");

        currentSection = sectionId;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


        if (sectionId === "candidateDashboard") {
            loadCandidateDashboard();
        }


        if (sectionId === "adminDashboard") {
            loadAdminDashboard();
        }

    }


    /* =====================================================
    HOME
    ===================================================== */

    function goHome() {

        showSection("home");

    }


    /* =====================================================
    LOGIN ROLE SELECTION
    ===================================================== */

    function selectLoginRole(role) {

        currentLoginRole = role;


        const candidateTab = $("candidateLoginTab");

        const adminTab = $("adminLoginTab");


        if (candidateTab) {
            candidateTab.classList.toggle(
                "active",
                role === "candidate"
            );
        }


        if (adminTab) {
            adminTab.classList.toggle(
                "active",
                role === "admin"
            );
        }


        const loginForm = $("loginForm");

        if (loginForm) {
            loginForm.reset();
        }

    }


    /* =====================================================
    SHOW SIGNUP
    ===================================================== */

    function showSignup() {

        showSection("signup");

    }


    /* =====================================================
    LOGIN FORM
    ===================================================== */

    const loginForm = $("loginForm");

    if (loginForm) {

        loginForm.addEventListener("submit", function (event) {

            event.preventDefault();


            const email = $("loginEmail")?.value.trim();

            const password = $("loginPassword")?.value;


            if (!email || !password) {

                alert("Please enter email and password.");

                return;
            }


            /* ---------------------------------------------
            ADMIN LOGIN
            --------------------------------------------- */

            if (currentLoginRole === "admin") {

                /*
                Temporary development login.

                Backend authentication will replace this
                when the server and database are connected.
                */

                if (
                    email === "admin@examshuffle.com" &&
                    password === "admin123"
                ) {

                    currentUser = {
                        role: "admin",
                        name: "Administrator",
                        email: email
                    };


                    alert("Admin login successful!");

                    showSection("adminDashboard");

                    loginForm.reset();

                    return;
                }


                alert(
                    "Invalid admin credentials.\n\n" +
                    "Development login:\n" +
                    "Email: admin@examshuffle.com\n" +
                    "Password: admin123"
                );

                return;
            }


            /* ---------------------------------------------
            CANDIDATE LOGIN
            --------------------------------------------- */

            const candidate = candidates.find(user => {

                return (
                    user.email === email &&
                    user.password === password
                );

            });


            if (!candidate) {

                alert(
                    "Invalid candidate email or password."
                );

                return;
            }


            currentUser = {
                id: candidate.id,
                role: "candidate",
                name: candidate.name,
                email: candidate.email,
                studentId: candidate.studentId
            };


            alert("Login successful!");

            showSection("candidateDashboard");

            loginForm.reset();

        });

    }


   /* =====================================================
   SIGNUP FORM - FIREBASE
===================================================== */

const signupForm = $("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name =
            $("signupName")?.value.trim();

        const studentId =
            $("signupStudentId")?.value.trim();

        const email =
            $("signupEmail")?.value.trim();

        const password =
            $("signupPassword")?.value;

        const confirmPassword =
            $("signupConfirmPassword")?.value;


        // Check fields
        if (
            !name ||
            !studentId ||
            !email ||
            !password ||
            !confirmPassword
        ) {

            alert("Please fill all required fields.");

            return;
        }


        // Check passwords
        if (password !== confirmPassword) {

            alert(
                "Password and confirm password do not match."
            );

            return;
        }


        // Check Firebase connection
        if (!window.firebaseAuth || !window.firebaseDB) {

            alert(
                "Firebase is not connected. Please check firebase-config.js."
            );

            return;
        }


        try {

            // Create Firebase Authentication account
            const userCredential =
                await createUserWithEmailAndPassword(
                    window.firebaseAuth,
                    email,
                    password
                );


            const user = userCredential.user;


            // Save candidate information in Firestore
            await setDoc(
                doc(
                    window.firebaseDB,
                    "candidates",
                    user.uid
                ),
                {
                    uid: user.uid,
                    name: name,
                    studentId: studentId,
                    email: email,
                    role: "candidate",
                    createdAt: new Date().toISOString()
                }
            );


            alert(
                "Candidate account created successfully!"
            );


            // Clear form
            signupForm.reset();


            // Open login page
            showSection("login");


            // Select candidate login
            selectLoginRole("candidate");


        } catch (error) {

            console.error(
                "Firebase signup error:",
                error
            );


            if (error.code === "auth/email-already-in-use") {

                alert(
                    "An account with this email already exists."
                );

            } else if (error.code === "auth/weak-password") {

                alert(
                    "Password should be at least 6 characters."
                );

            } else if (error.code === "auth/invalid-email") {

                alert(
                    "Please enter a valid email address."
                );

            } else {

                alert(
                    "Account creation failed: " +
                    error.message
                );

            }

        }

    });

}

    /* =====================================================
    LOGOUT
    ===================================================== */

    function logout() {

        if (testStarted) {

            const confirmLogout =
                confirm(
                    "A test is currently running. " +
                    "Are you sure you want to logout?"
                );


            if (!confirmLogout) {
                return;
            }

        }


        stopTestEnvironment();

        currentUser = null;

        activeTest = null;

        currentQuestionIndex = 0;

        userAnswers = {};

        showSection("home");

    }


    /* =====================================================
    LOCAL STORAGE
    ===================================================== */

    function saveLocalData() {

        localStorage.setItem(
            "examshuffle_candidates",
            JSON.stringify(candidates)
        );


        localStorage.setItem(
            "examshuffle_tests",
            JSON.stringify(tests)
        );


        localStorage.setItem(
            "examshuffle_submissions",
            JSON.stringify(submissions)
        );


        localStorage.setItem(
            "examshuffle_activityLogs",
            JSON.stringify(activityLogs)
        );

    }


    /* =====================================================
    LOAD LOCAL STORAGE
    ===================================================== */

    function loadLocalData() {

        try {

            candidates =
                JSON.parse(
                    localStorage.getItem(
                        "examshuffle_candidates"
                    )
                ) || [];


            tests =
                JSON.parse(
                    localStorage.getItem(
                        "examshuffle_tests"
                    )
                ) || [];


            submissions =
                JSON.parse(
                    localStorage.getItem(
                        "examshuffle_submissions"
                    )
                ) || [];


            activityLogs =
                JSON.parse(
                    localStorage.getItem(
                        "examshuffle_activityLogs"
                    )
                ) || [];

        }

        catch (error) {

            console.error(
                "Unable to load saved data:",
                error
            );


            candidates = [];

            tests = [];

            submissions = [];

            activityLogs = [];

        }

    }


    /* =====================================================
    INITIALIZE APPLICATION
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            loadLocalData();

            showSection("home");

        }
    );
    /* =====================================================
    PART 2A
    ADMIN DASHBOARD + TEST MANAGEMENT
    ===================================================== */


    /* =====================================================
    GENERATE UNIQUE ID
    ===================================================== */

    function generateId(prefix) {

        return prefix +
            "-" +
            Date.now() +
            "-" +
            Math.floor(Math.random() * 1000);

    }


    /* =====================================================
    ADMIN DASHBOARD
    ===================================================== */

    function loadAdminDashboard() {

        const candidateCount =
            $("adminCandidateCount");

        const testCount =
            $("adminTestCount");

        const submissionCount =
            $("adminSubmissionCount");

        const violationCount =
            $("adminViolationCount");


        if (candidateCount) {
            candidateCount.textContent =
                candidates.length;
        }


        if (testCount) {
            testCount.textContent =
                tests.length;
        }


        if (submissionCount) {
            submissionCount.textContent =
                submissions.length;
        }


        if (violationCount) {

            violationCount.textContent =
                activityLogs.filter(
                    log => log.type === "violation"
                ).length;

        }


        renderAdminTests();

        renderAdminActivityLogs();

    }


    /* =====================================================
    SHOW ADMIN TEST FORM
    ===================================================== */

    function showAdminTestForm() {

        const form =
            $("adminTestForm");

        if (!form) {
            return;
        }

        form.classList.remove("hidden");

        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    /* =====================================================
    HIDE ADMIN TEST FORM
    ===================================================== */

    function hideAdminTestForm() {

        const form =
            $("adminTestForm");

        if (!form) {
            return;
        }

        form.classList.add("hidden");


        const createForm =
            $("createTestForm");

        if (createForm) {
            createForm.reset();
        }

    }


    /* =====================================================
    CREATE TEST
    ===================================================== */

    const createTestForm =
        $("createTestForm");


    if (createTestForm) {

        createTestForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const title =
                    $("testTitle")?.value.trim();

                const type =
                    $("testType")?.value;

                const duration =
                    Number(
                        $("testDuration")?.value
                    );

                const questionCount =
                    Number(
                    $("testQuestionCount")?.value
                    );    

                const totalMarks =
                    Number(
                        $("testTotalMarks")?.value
                    );

                const startDateTime =
        $("testStartDateTime")?.value;

    const endDateTime =
        $("testEndDateTime")?.value;

    const description =
        $("testDescription")?.value.trim();


    if (
        !startDateTime ||
        !endDateTime
    ) {
        alert(
            "Please select Start Date & Time and End Date & Time."
        );

        return;
    }


    if (
        new Date(endDateTime) <=
        new Date(startDateTime)
    ) {
        alert(
            "End Date & Time must be after Start Date & Time."
        );

        return;
    }


    if (
        !title ||
        !type ||
        !duration ||
        !questionCount ||
        !totalMarks
    ) {

        alert(
            "Please fill all required test details."
        );

        return;
    }

                const newTest = {

                    id:
                        generateId("TEST"),

                    title:
                        title,

                    type:
                        type,

                    duration:
                        duration,

                    questionCount:
                        questionCount,    

                    totalMarks:
                        totalMarks,

                    startDateTime:
                        startDateTime,  
                        
                    endDateTime:
                        endDateTime,

                    description:
                        description,

                    questions:
                        [],

                    createdAt:
                        new Date().toISOString(),

                    status:
                        "active"

                };


                tests.push(newTest);

                saveLocalData();

                openAutoQuestionSetup(newTest.id);


                alert(
                    "Test created successfully!"
                );


                createTestForm.reset();

                hideAdminTestForm();

                renderAdminTests();

                loadAdminDashboard();

            }
        );

    }


    /* =====================================================
    RENDER ADMIN TESTS
    ===================================================== */
    function getTestScheduleStatus(test) {

        if (
            !test.startDateTime ||
            !test.endDateTime
        ) {
            return "Not Scheduled";
        }

        const now =
            new Date();

        const start =
            new Date(test.startDateTime);

        const end =
            new Date(test.endDateTime);

        if (now < start) {
            return "Upcoming";
        }

        if (
            now >= start &&
            now < end
        ) {
            return "Live";
        }

        return "Ended";
    }

    function renderAdminTests() {

        const container =
            $("adminTestList");

        if (!container) {
            return;
        }
        
        // Question Management Test Selector
    let questionTestSelector =
        $("questionTestSelector");

    if (!questionTestSelector) {

        questionTestSelector =
            document.createElement("div");

        questionTestSelector.id =
            "questionTestSelector";

        questionTestSelector.className =
            "form-group";

        container.parentNode.insertBefore(
            questionTestSelector,
            container
        );
    }

    questionTestSelector.innerHTML = `

        <label>
            Manage Questions
        </label>

        <select
            onchange="
                if (this.value) {
                    openQuestionManagerForTest(this.value);
                }
            "
        >

            <option value="">
                Select Test
            </option>

            ${
                [...tests]
                    .sort(
                        (a, b) =>
                            a.title.localeCompare(
                                b.title
                            )
                    )
                    .map(
                        test => `
                    <option
                    value="${test.id}"
                    >
                    ${escapeHTML(test.title)}
                    </option>
                `
            )  
                    .join("")
            }

        </select>

    `;

        if (tests.length === 0) {

            container.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        📝
                    </div>

                    <h4>
                        No Tests Created
                    </h4>

                    <p>
                        Create your first assessment
                        to get started.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            tests.map(test => {

                const questionCount =
                    Array.isArray(test.questions)
                        ? test.questions.length
                        : 0;


                return `

                    <div class="data-item">

                        <div class="data-main">

                            <h4>
                                ${escapeHTML(test.title)}
                            </h4>

                            <p>
                                ${escapeHTML(
                                    test.description ||
                                    "No description provided."
                                )}
                            </p>

                            <div class="data-meta">
                                
                                <span>
                                    📅
                                    ${getTestScheduleStatus(test)}
                                </span>

                                <span>
                                    📋
                                    ${test.type.toUpperCase()}
                                </span>

                                <span>
                                    ⏱️
                                    ${test.duration} min
                                </span>

                                <span>
                                    🎯
                                    ${test.totalMarks} marks
                                </span>

                                <span>
                                    ❓
                                    ${questionCount} questions
                                </span>

                            </div>

                        </div>


                        <div class="data-actions">

                            <button
                                class="outline-btn"
                                onclick="openQuestionManagerForTest('${test.id}')"
                            >
                                Questions
                            </button>

                            <button
                                class="danger-btn"
                                onclick="deleteTest('${test.id}')"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                `;

            }).join("");

    }


    /* =====================================================
    DELETE TEST
    ===================================================== */

    function deleteTest(testId) {

        const test =
            tests.find(
                item => item.id === testId
            );


        if (!test) {
            return;
        }


        const confirmed =
            confirm(
                `Delete "${test.title}"?\n\n` +
                "All questions inside this test " +
                "will also be removed."
            );


        if (!confirmed) {
            return;
        }


        tests =
            tests.filter(
                item => item.id !== testId
            );


        saveLocalData();

        renderAdminTests();

        loadAdminDashboard();


        alert(
            "Test deleted successfully."
        );

    }


    /* =====================================================
    QUESTION MANAGER STATE
    ===================================================== */

    let selectedQuestionType = "mcq";

    let selectedTestId = null;


    /* =====================================================
    OPEN QUESTION MANAGER
    ===================================================== */

    function openQuestionManager(type) {

        if (tests.length === 0) {

            alert(
                "Please create a test first."
            );

            return;
        }

        selectedQuestionType =
            type || "mcq";

        selectedTestId =
            null;

        showQuestionManagerSelector();

    }
    function showQuestionManagerSelector() {

        let modal =
            $("questionManagerModal");

        if (!modal) {

            modal =
                document.createElement("div");

            modal.id =
                "questionManagerModal";

            modal.className =
                "modal-overlay";

            document.body.appendChild(
                modal
            );
        }

        modal.innerHTML = `

            <div class="modal-box">

                <div class="modal-header">

                    <div>

                        <p class="hero-tag">
                            QUESTION MANAGEMENT
                        </p>

                        <h2>
                            Select Test
                        </h2>

                        <p>
                            Choose a test to manage its questions.
                        </p>

                    </div>

                    <button
                        class="modal-close"
                        onclick="closeQuestionManager()"
                    >
                        ✕
                    </button>

                </div>


                <div class="add-question-card">

                    <div class="form-group">

                        <label>
                            Select Test
                        </label>

                        <select
                            id="questionManagerTestSelect"
                            onchange="changeQuestionManagerTest(this.value)"
                        >

                            <option value="">
                                -- Select Test --
                            </option>

                            ${
                                tests
                                    .map(
                                        test => `
                                            <option
                                                value="${test.id}"
                                            >
                                                ${escapeHTML(test.title)}
                                            </option>
                                        `
                                    )
                                    .join("")
                            }

                        </select>

                    </div>

                </div>

            </div>

        `;

        modal.classList.add("active");
    }

    function changeQuestionManagerTest(testId) {

        if (!testId) {
            return;
        }

        const test =
            tests.find(
                item => item.id === testId
            );

        if (!test) {
            return;
        }

        selectedTestId =
            testId;

        // For normal tests, use their fixed type
        if (test.type === "mcq") {

            selectedQuestionType =
                "mcq";

        }

        else if (test.type === "coding") {

            selectedQuestionType =
                "coding";

        }

        // For mixed test, default to MCQ
        else if (test.type === "mixed") {

            selectedQuestionType =
                "mcq";

        }

        showQuestionManagerModal(
            test
        );

    }

    /* =====================================================
    OPEN QUESTION MANAGER FOR TEST
    ===================================================== */

    function openQuestionManagerForTest(testId) {

        selectedTestId =
            testId;


        const test =
            tests.find(
                item => item.id === testId
            );


        if (!test) {

            alert(
                "Test not found."
            );

            return;
        }


        if (test.type === "mixed") {

            if (
                selectedQuestionType !== "mcq" &&
                selectedQuestionType !== "coding"
            ) {

                selectedQuestionType =
                    "mcq";

            }

        }

        else {

            selectedQuestionType =
                test.type;

        }


        showQuestionManagerModal(
            test
        );

    }
    /* =====================================================
    PART 2B
    QUESTION MANAGER
    ===================================================== */


    /* =====================================================
    SHOW QUESTION MANAGER MODAL
    ===================================================== */

    let autoQuestionTestId = null;
    let autoQuestionIndex = 0;
    let autoQuestionDrafts = [];


    function openAutoQuestionSetup(testId) {

        const test =
            tests.find(
                item => item.id === testId
            );

        if (!test) {
            return;
        }

        autoQuestionTestId = testId;
        autoQuestionIndex = 0;
        autoQuestionDrafts = [];

        const count =
            Number(test.questionCount || 0);

        if (!count) {
            return;
        }

        autoQuestionTestId =
            testId;

        autoQuestionIndex =
            0;

        autoQuestionDrafts =
            Array.from(
                { length: count },
                (_, index) =>
                    test.questions?.[index]
                        ? { ...test.questions[index] }
                        : null
            );

        let modal =
            $("autoQuestionSetupModal");

        if (!modal) {

            modal =
                document.createElement("div");

            modal.id =
                "autoQuestionSetupModal";

            modal.className =
                "modal-overlay";

            document.body.appendChild(
                modal
            );
        }

        renderAutoQuestionPage();

        modal.classList.add(
            "active"
        );
    }


    function renderAutoQuestionPage() {

        const test =
            tests.find(
                item =>
                    item.id ===
                    autoQuestionTestId
            );

        if (!test) {
            return;
        }

        const count =
            Number(test.questionCount || 0);

        const modal =
            $("autoQuestionSetupModal");

        if (!modal) {
            return;
        }

        modal.innerHTML = `

            <div class="modal-box auto-question-modal">

                <div class="modal-header">

                    <div>

                        <p class="hero-tag">
                            QUESTION SETUP
                        </p>

                        <h2>
                            ${escapeHTML(test.title)}
                        </h2>

                        <p>
                            Question
                            ${autoQuestionIndex + 1}
                            of
                            ${count}
                        </p>

                    </div>

                    <button
                        class="modal-close"
                        onclick="closeAutoQuestionSetup()"
                    >
                        ✕
                    </button>

                </div>


                <div id="autoQuestionList">

                    ${renderAutoQuestionSlot(
                        test,
                        autoQuestionIndex
                    )}

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        class="secondary-btn"
                        onclick="previousAutoQuestion()"
                        ${autoQuestionIndex === 0 ? "disabled" : ""}
                    >
                        ← Previous
                    </button>


                    ${
                        autoQuestionIndex <
                        count - 1

                        ?

                        `
                        <button
                            type="button"
                            class="primary-btn"
                            onclick="nextAutoQuestion()"
                        >
                            Next →
                        </button>
                        `

                        :

                        `
                        <button
                            type="button"
                            class="primary-btn"
                            onclick="saveAutoQuestions('${test.id}')"
                        >
                            Save All Questions
                        </button>
                        `
                    }

                </div>

            </div>

        `;

        restoreAutoQuestionDraft(
            test,
            autoQuestionIndex
        );
    }


    function saveCurrentAutoQuestionDraft() {

        const test =
            tests.find(
                item =>
                    item.id ===
                    autoQuestionTestId
            );

        if (!test) {
            return;
        }

        const index =
            autoQuestionIndex;

        let type =
            test.type;

        if (test.type === "mixed") {

            const typeSelect =
                document.querySelector(
                    `.auto-question-type[data-index="${index}"]`
                );

            type =
                typeSelect?.value ||
                "mcq";
        }


        if (type === "mcq") {

            autoQuestionDrafts[index] = {

                id:
                    autoQuestionDrafts[index]?.id ||
                    generateId("Q"),

                type:
                    "mcq",

                text:
                    $(`autoQuestionText_${index}`)
                        ?.value.trim() || "",

                options: [

                    $(`autoOption0_${index}`)
                        ?.value.trim() || "",

                    $(`autoOption1_${index}`)
                        ?.value.trim() || "",

                    $(`autoOption2_${index}`)
                        ?.value.trim() || "",

                    $(`autoOption3_${index}`)
                        ?.value.trim() || ""

                ],

                correctAnswer:
                    Number(
                        $(`autoCorrectAnswer_${index}`)
                            ?.value || 0
                    ),

                marks:
                    1

            };

        }
    else if (type === "coding") {

        const oldDraft =
            autoQuestionDrafts[index] || {};

        autoQuestionDrafts[index] = {

            ...oldDraft,

            id:
                oldDraft.id ||
                generateId("Q"),

            type:
                "coding",

            title:
                $(`autoCodingTitle_${index}`)
                    ?.value.trim() ||
                oldDraft.title ||
                "",

            text:
                $(`autoCodingText_${index}`)
                    ?.value.trim() ||
                oldDraft.text ||
                "",

            sampleInput:
                $(`autoCodingInput_${index}`)
                    ?.value.trim() ||
                oldDraft.sampleInput ||
                "",

            sampleOutput:
                $(`autoCodingOutput_${index}`)
                    ?.value.trim() ||
                oldDraft.sampleOutput ||
                "",

            testCases:
                oldDraft.testCases ||
                [],

            marks:
                oldDraft.marks ||
                10

        };

    }
    }

        

    function restoreAutoQuestionDraft(
        test,
        index
    ) {

        const draft =
            autoQuestionDrafts[index];

        if (!draft) {
            return;
        }


        if (draft.type === "mcq") {

            const text =
                $(`autoQuestionText_${index}`);

            if (text) {
                text.value =
                    draft.text || "";
            }


            (draft.options || [])
                .forEach(
                    (option, optionIndex) => {

                        const input =
                            $(
                                `autoOption${optionIndex}_${index}`
                            );

                        if (input) {
                            input.value =
                                option || "";
                        }

                    }
                );


            const correct =
                $(
                    `autoCorrectAnswer_${index}`
                );

            if (correct) {
                correct.value =
                    String(
                        draft.correctAnswer ?? 0
                    );
            }

        }


        else if (draft.type === "coding") {

            const title =
                $(`autoCodingTitle_${index}`);

            const text =
                $(`autoCodingText_${index}`);

            const input =
                $(`autoCodingInput_${index}`);

            const output =
                $(`autoCodingOutput_${index}`);


            if (title) {
                title.value =
                    draft.title || "";
            }

            if (text) {
                text.value =
                    draft.text || "";
            }

            if (input) {
                input.value =
                    draft.sampleInput || "";
            }

            if (output) {
                output.value =
                    draft.sampleOutput || "";
            }

        }


        if (test.type === "mixed") {

            const typeSelect =
                document.querySelector(
                    `.auto-question-type[data-index="${index}"]`
                );

            if (typeSelect) {

                typeSelect.value =
                    draft.type || "mcq";

            }

        }

    }


    function nextAutoQuestion() {

        saveCurrentAutoQuestionDraft();

        const test =
            tests.find(
                item =>
                    item.id ===
                    autoQuestionTestId
            );

        if (!test) {
            return;
        }

        const count =
            Number(test.questionCount || 0);

        if (
            autoQuestionIndex <
            count - 1
        ) {

            autoQuestionIndex++;

            renderAutoQuestionPage();
        }

    }


    function previousAutoQuestion() {

        saveCurrentAutoQuestionDraft();

        if (
            autoQuestionIndex > 0
        ) {

            autoQuestionIndex--;

            renderAutoQuestionPage();
        }

    }
    function renderAutoQuestionSlot(test, index) {

        const fixedType =
            test.type === "mcq"
                ? "mcq"
                : test.type === "coding"
                    ? "coding"
                    : null;


        const draftType =
            autoQuestionDrafts[index]?.type || "mcq";


        const currentType =
            fixedType || draftType;


        return `

            <div
                class="auto-question-card"
                data-question-index="${index}"
            >

                <div class="auto-question-header">

                    <h3>
                        Question ${index + 1}
                    </h3>

                    ${
                        fixedType
                            ? `
                                <span class="question-type-badge">
                                    ${fixedType.toUpperCase()}
                                </span>
                            `
                            : `
                                <select
                                    class="auto-question-type"
                                    data-index="${index}"
                                    onchange="changeAutoQuestionType(${index})"
                                >

                                    <option
                                        value="mcq"
                                        ${currentType === "mcq" ? "selected" : ""}
                                    >
                                        MCQ
                                    </option>

                                    <option
                                        value="coding"
                                        ${currentType === "coding" ? "selected" : ""}
                                    >
                                        Coding
                                    </option>

                                </select>
                            `
                    }

                </div>


                <div
                    id="autoQuestionContent_${index}"
                    class="auto-question-content"
                >

                    ${renderAutoQuestionForm(
                        currentType,
                        index
                    )}

                </div>

            </div>

        `;
    }


    function renderAutoQuestionForm(type, index) {

        if (type === "coding") {

            return `

                <div class="form-group">

                    <label>
                        Problem Title
                    </label>

                    <input
                        type="text"
                        id="autoCodingTitle_${index}"
                        placeholder="Example: Two Sum"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Problem Statement
                    </label>

                    <textarea
                        id="autoCodingText_${index}"
                        rows="5"
                        placeholder="Describe the coding problem..."
                    ></textarea>

                </div>


                <div class="form-row">

                    <div class="form-group">

                        <label>
                            Sample Input
                        </label>

                        <textarea
                            id="autoCodingInput_${index}"
                            rows="3"
                            placeholder="Example input..."
                        ></textarea>

                    </div>


                    <div class="form-group">

                        <label>
                            Sample Output
                        </label>

                        <textarea
                            id="autoCodingOutput_${index}"
                            rows="3"
                            placeholder="Example output..."
                        ></textarea>

                    </div>

                </div>


                <!-- TEST CASES -->

                <div class="form-group">

                    <label>
                        Test Cases
                    </label>

                    <div id="autoCodingTestCases_${index}">

                        <div class="coding-test-case">

                            <div class="test-case-header">

                                <strong>
                                    Test Case 1
                                </strong>

                                <button
                                    type="button"
                                    class="danger-btn"
                                    onclick="this.closest('.coding-test-case').remove()"
                                >
                                    Delete
                                </button>

                            </div>


                            <div class="form-row">

                                <div class="form-group">

                                    <label>
                                        Input
                                    </label>

                                    <textarea
                                        class="auto-coding-test-input"
                                        rows="3"
                                        placeholder="Test input..."
                                    ></textarea>

                                </div>


                                <div class="form-group">

                                    <label>
                                        Output
                                    </label>

                                    <textarea
                                        class="auto-coding-test-output"
                                        rows="3"
                                        placeholder="Expected output..."
                                    ></textarea>

                                </div>

                            </div>

                        </div>

                    </div>


                    <button
                        type="button"
                        class="outline-btn"
                        onclick="addAutoCodingTestCase(${index})"
                        style="margin-top: 10px;"
                    >
                        + Add Test Case
                    </button>

                </div>

            `;

        }


        return `

            <div class="form-group">

                <label>
                    Question
                </label>

                <textarea
                    id="autoQuestionText_${index}"
                    rows="4"
                    placeholder="Enter your question..."
                ></textarea>

            </div>


            <div class="form-row">

                <div class="form-group">

                    <label>
                        Option A
                    </label>

                    <input
                        type="text"
                        id="autoOption0_${index}"
                        placeholder="Option A"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Option B
                    </label>

                    <input
                        type="text"
                        id="autoOption1_${index}"
                        placeholder="Option B"
                    >

                </div>

            </div>


            <div class="form-row">

                <div class="form-group">

                    <label>
                        Option C
                    </label>

                    <input
                        type="text"
                        id="autoOption2_${index}"
                        placeholder="Option C"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Option D
                    </label>

                    <input
                        type="text"
                        id="autoOption3_${index}"
                        placeholder="Option D"
                    >

                </div>

            </div>


            <div class="form-group">

                <label>
                    Correct Answer
                </label>

                <select
                    id="autoCorrectAnswer_${index}"
                >

                    <option value="0">
                        A
                    </option>

                    <option value="1">
                        B
                    </option>

                    <option value="2">
                        C
                    </option>

                    <option value="3">
                        D
                    </option>

                </select>

            </div>

        `;

    }

    function addAutoCodingTestCase(index) {

        const container =
            $(`autoCodingTestCases_${index}`);

        if (!container) {
            return;
        }

        const testCaseNumber =
            container.querySelectorAll(
                ".coding-test-case"
            ).length + 1;

        const testCase =
            document.createElement("div");

        testCase.className =
            "coding-test-case";

        testCase.innerHTML = `

            <div class="test-case-header">

                <strong>
                    Test Case ${testCaseNumber}
                </strong>

                <button
                    type="button"
                    class="danger-btn"
                    onclick="this.closest('.coding-test-case').remove()"
                >
                    Delete
                </button>

            </div>


            <div class="form-row">

                <div class="form-group">

                    <label>
                        Input
                    </label>

                    <textarea
                        class="auto-coding-test-input"
                        rows="3"
                        placeholder="Test input..."
                    ></textarea>

                </div>


                <div class="form-group">

                    <label>
                        Output
                    </label>

                    <textarea
                        class="auto-coding-test-output"
                        rows="3"
                        placeholder="Expected output..."
                    ></textarea>

                </div>

            </div>

        `;

        container.appendChild(testCase);

    }

    function changeAutoQuestionType(index) {

        const select =
            document.querySelector(
                `.auto-question-type[data-index="${index}"]`
            );

        if (!select) {
            return;
        }


        const content =
            $(`autoQuestionContent_${index}`);

        if (!content) {
            return;
        }


        content.innerHTML =
            renderAutoQuestionForm(
                select.value,
                index
            );

    }


    function saveAutoQuestions(testId) {

        const test =
            tests.find(
                item => item.id === testId
            );

        if (!test || !isAdmin()) {
            return;
        }


        const count =
            Number(test.questionCount || 0);


        if (!count) {
            alert(
                "Number of questions is not configured."
            );

            return;
        }


        const questions = [];


        for (let index = 0; index < count; index++) {

            let type =
                test.type;


            if (test.type === "mixed") {

                const typeSelect =
                    document.querySelector(
                        `.auto-question-type[data-index="${index}"]`
                    );

                type =
                    typeSelect?.value || "mcq";
            }


            if (type === "mcq") {

                const text =
                    $(`autoQuestionText_${index}`)?.value.trim();

                const options = [
                    $(`autoOption0_${index}`)?.value.trim(),
                    $(`autoOption1_${index}`)?.value.trim(),
                    $(`autoOption2_${index}`)?.value.trim(),
                    $(`autoOption3_${index}`)?.value.trim()
                ];


                const correctAnswer =
                    Number(
                        $(`autoCorrectAnswer_${index}`)?.value
                    );


                if (
                    !text ||
                    options.some(
                        option => !option
                    )
                ) {

                    alert(
                        `Please complete MCQ Question ${index + 1}.`
                    );

                    return;
                }


                questions.push({

                    id:
                        generateId("Q"),

                    type:
                        "mcq",

                    text:
                        text,

                    options:
                        options,

                    correctAnswer:
                        correctAnswer,

                    marks:
                        1

                });

            }


            else if (type === "coding") {

                const title =
                    $(`autoCodingTitle_${index}`)?.value.trim();

                const text =
                    $(`autoCodingText_${index}`)?.value.trim();

                const sampleInput =
                    $(`autoCodingInput_${index}`)?.value.trim();

                const sampleOutput =
                    $(`autoCodingOutput_${index}`)?.value.trim();


                if (
                    !title ||
                    !text
                ) {

                    alert(
                        `Please complete Coding Question ${index + 1}.`
                    );

                    return;
                }


                questions.push({

                    id:
                        generateId("Q"),

                    type:
                        "coding",

                    title:
                        title,

                    text:
                        text,

                    sampleInput:
                        sampleInput,

                    sampleOutput:
                        sampleOutput,

                    testCases:
                        [],

                    marks:
                        10

                });

            }

        }


        test.questions =
            questions;


        saveLocalData();


        closeAutoQuestionSetup();


        renderAdminTests();

        loadAdminDashboard();


        alert(
            `${questions.length} question${questions.length > 1 ? "s" : ""} saved successfully!`
        );

    }


    function closeAutoQuestionSetup() {

        const modal =
            $("autoQuestionSetupModal");

        if (modal) {

            modal.classList.remove(
                "active"
            );

        }

    }

  

    function showQuestionManagerModal(test) {
        if(!isAdmin()) { 
            return;
        }

        let modal =
            $("questionManagerModal");


        if (!modal) {

            modal =
                document.createElement("div");

            modal.id =
                "questionManagerModal";

            modal.className =
                "modal-overlay";

            document.body.appendChild(
                modal
            );

        }


        const questions =
            Array.isArray(test.questions)
                ? test.questions
                : [];


        const filteredQuestions =
            questions.filter(
                question =>
                    question.type ===
                    selectedQuestionType
            );

        modal.innerHTML = `

            <div class="modal-box">

                <div class="modal-header">

                    <div>

                        <p class="hero-tag">
                            QUESTION MANAGEMENT
                        </p>

                        <h2>
                            ${escapeHTML(test.title)}
                        </h2>

                        <p>
                            Manage
                            ${selectedQuestionType.toUpperCase()}
                            questions.
                        </p>

                    </div>

                    <button
                        class="modal-close"
                        onclick="closeQuestionManager()"
                    >
                        ✕
                    </button>

                </div>


                <div class="question-manager-actions">
                ${
        test.type === "mixed"
        ?
        `
        <div class="form-group">

            <label>
                Question Type
            </label>

            <select
                onchange="
                    selectedQuestionType = this.value;
                    showQuestionManagerModal(test);
                "
            >

                <option
                    value="mcq"
                    ${
                        selectedQuestionType === "mcq"
                            ? "selected"
                            : ""
                    }
                >
                    MCQ
                </option>

                <option
                    value="coding"
                    ${
                        selectedQuestionType === "coding"
                            ? "selected"
                            : ""
                    }
                >
                    Coding
                </option>


            </select>

        </div>
        `
        :
        ""
    }

        <button
            class="primary-btn"
            onclick="showAddQuestionForm('${test.id}')"
        >
            + Add Question
        </button>

    </div>


                <div
                    id="questionManagerList"
                    class="question-manager-list"
                >

                    ${
                        filteredQuestions.length === 0

                        ?

                        `
                        <div class="empty-state">

                            <div class="empty-icon">
                                ${
                                    selectedQuestionType === "mcq"
                                    ? "📝"
                                    : "💻"
                                }
                            </div>

                            <h4>
                                No questions yet
                            </h4>

                            <p>
                                Add your first question
                                to this test.
                            </p>

                        </div>
                        `

                        :

                        filteredQuestions
                            .map(
                                (question, index) =>
                                    renderQuestionItem(
                                        question,
                                        index,
                                        test.id
                                    )
                            )
                            .join("")
                    }

                </div>


                <div
                    id="addQuestionArea"
                    class="add-question-area hidden"
                ></div>

            </div>

        `;


        modal.classList.add("active");

    }


    /* =====================================================
    RENDER QUESTION ITEM
    ===================================================== */

    function renderQuestionItem(
        question,
        index,
        testId
    ) {

        if (question.type === "mcq") {

            return `

                <div class="question-manager-item">

                    <div>

                        <span class="question-index">
                            Q${index + 1}
                        </span>

                        <h4>
                            ${escapeHTML(
                                question.text
                            )}
                        </h4>

                        <div class="question-options-preview">

                            ${
                                question.options
                                    .map(
                                        (
                                            option,
                                            optionIndex
                                        ) => `

                                            <span
                                                class="${
                                                    optionIndex ===
                                                    question.correctAnswer
                                                        ? "correct-option"
                                                        : ""
                                                }"
                                            >

                                                ${
                                                    String.fromCharCode(
                                                        65 +
                                                        optionIndex
                                                    )
                                                }.

                                                ${escapeHTML(
                                                    option
                                                )}

                                            </span>

                                        `
                                    )
                                    .join("")
                            }

                        </div>

                    </div>


                    <div class="data-actions">

                    <button
                        class="outline-btn"
                        onclick="editQuestion(
                        '${testId}',
                        '${question.id}'
                        )"
                        >
            Edit
        </button> 

                        <button
                            class="danger-btn"
                            onclick="deleteQuestion(
                                '${testId}',
                                '${question.id}'
                            )"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            `;

        }


        return `

            <div class="question-manager-item">

                <div>

                    <span class="question-index">
                        Q${index + 1}
                    </span>

                    <h4>
                        ${escapeHTML(
                            question.title ||
                            question.text
                        )}
                    </h4>

                    <p>
                        💻 Coding Question
                    </p>

                    <p>
                        🧪
                        ${
                            question.testCases
                                ? question.testCases.length
                                : 0
                        }
                        test cases
                    </p>

                </div>


                <div class="data-actions">


                <button
                        class="outline-btn"
                        onclick="editQuestion(
                        '${testId}',
                        '${question.id}'
                        )"
                        >
            Edit
        </button> 

                    <button
                        class="danger-btn"
                        onclick="deleteQuestion(
                            '${testId}',
                            '${question.id}'
                        )"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `;

    }


    /* =====================================================
    SHOW ADD QUESTION FORM
    ===================================================== */

    function addCodingTestCase() {

        const container =
            $("codingTestCases");

        if (!container) {
            return;
        }


        const testCaseNumber =
            container.querySelectorAll(
                ".coding-test-case"
            ).length + 1;


        const testCase =
            document.createElement("div");

        testCase.className =
            "coding-test-case";


        testCase.innerHTML = `

            <div class="test-case-header">

                <strong>
                    Test Case ${testCaseNumber}
                </strong>

                <button
                    type="button"
                    class="danger-btn"
                    onclick="this.closest('.coding-test-case').remove()"
                >
                    Delete
                </button>

            </div>


            <div class="form-row">

                <div class="form-group">

                    <label>
                        Input
                    </label>

                    <textarea
                        class="coding-test-input"
                        rows="3"
                        placeholder="Test input..."
                    ></textarea>

                </div>


                <div class="form-group">

                    <label>
                        Output
                    </label>

                    <textarea
                        class="coding-test-output"
                        rows="3"
                        placeholder="Expected output..."
                    ></textarea>

                </div>

            </div>

        `;


        container.appendChild(testCase);

    }

    function showAddQuestionForm(testId) {

        const area =
            $("addQuestionArea");


        if (!area) {
            return;
        }


        area.classList.remove("hidden");


        if (selectedQuestionType === "mcq") {

            area.innerHTML = `

                <div class="add-question-card">

                    <div class="card-header">

                        <div>

                            <h3>
                                Add MCQ Question
                            </h3>

                            <p>
                                Enter question and
                                four options.
                            </p>

                        </div>

                    </div>


                    <div class="form-group">

                        <label>
                            Question
                        </label>

                        <textarea
                            id="newQuestionText"
                            rows="4"
                            placeholder="Enter your question..."
                        ></textarea>

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label>
                                Option A
                            </label>

                            <input
                                type="text"
                                id="newOption0"
                                placeholder="Option A"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Option B
                            </label>

                            <input
                                type="text"
                                id="newOption1"
                                placeholder="Option B"
                            >

                        </div>

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label>
                                Option C
                            </label>

                            <input
                                type="text"
                                id="newOption2"
                                placeholder="Option C"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Option D
                            </label>

                            <input
                                type="text"
                                id="newOption3"
                                placeholder="Option D"
                            >

                        </div>

                    </div>


                    <div class="form-group">

                        <label>
                            Correct Answer
                        </label>

                        <select id="newCorrectAnswer">

                            <option value="0">
                                A
                            </option>

                            <option value="1">
                                B
                            </option>

                            <option value="2">
                                C
                            </option>

                            <option value="3">
                                D
                            </option>

                        </select>

                    </div>


                    <div class="form-actions">

                        <button
                            type="button"
                            class="secondary-btn"
                            onclick="hideAddQuestionForm()"
                        >
                            Cancel
                        </button>


                        <button
                            type="button"
                            class="primary-btn"
                            onclick="saveMCQQuestion('${testId}')"
                        >
                            Save Question
                        </button>

                    </div>

                </div>

            `;

        }

        else {

        area.innerHTML = `

            <div class="add-question-card">

                <div class="card-header">

                    <div>

                        <h3>
                            Add Coding Question
                        </h3>

                        <p>
                            Add programming problem
                            details and test cases.
                        </p>

                    </div>

                </div>


                <div class="form-group">

                    <label>
                        Problem Title
                    </label>

                    <input
                        type="text"
                        id="codingQuestionTitle"
                        placeholder="Example: Two Sum"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Problem Statement
                    </label>

                    <textarea
                        id="codingQuestionText"
                        rows="6"
                        placeholder="Describe the coding problem..."
                    ></textarea>

                </div>


                <div class="form-group">

                    <label>
                        Sample Input
                    </label>

                    <textarea
                        id="codingSampleInput"
                        rows="3"
                        placeholder="Example input..."
                    ></textarea>

                </div>


                <div class="form-group">

                    <label>
                        Sample Output
                    </label>

                    <textarea
                        id="codingSampleOutput"
                        rows="3"
                        placeholder="Expected output..."
                    ></textarea>

                </div>


                <!-- =========================
                    TEST CASES
                ========================== -->

                <div class="test-cases-section">

                    <div class="card-header">

                        <div>

                            <h3>
                                Test Cases
                            </h3>

                            <p>
                                Add input and expected output
                                for code evaluation.
                            </p>

                        </div>


                        <button
                            type="button"
                            class="outline-btn"
                            onclick="addCodingTestCase()"
                        >
                            + Add Test Case
                        </button>

                    </div>


                    <div id="codingTestCases">

                        <div class="coding-test-case">

                            <div class="test-case-header">

                                <strong>
                                    Test Case 1
                                </strong>

                            </div>


                            <div class="form-row">

                                <div class="form-group">

                                    <label>
                                        Input
                                    </label>

                                    <textarea
                                        class="coding-test-input"
                                        rows="3"
                                        placeholder="Test input..."
                                    ></textarea>

                                </div>


                                <div class="form-group">

                                    <label>
                                        Output
                                    </label>

                                    <textarea
                                        class="coding-test-output"
                                        rows="3"
                                        placeholder="Expected output..."
                                    ></textarea>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        class="secondary-btn"
                        onclick="hideAddQuestionForm()"
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        class="primary-btn"
                        onclick="saveCodingQuestion('${testId}')"
                    >
                        Save Question
                    </button>

                </div>

            </div>

        `;

    }

    }
    /* =====================================================
    PART 2C
    SAVE / DELETE QUESTIONS + ADMIN RESULTS
    ===================================================== */


    /* =====================================================
    HIDE ADD QUESTION FORM
    ===================================================== */

    function hideAddQuestionForm() {

        const area =
            $("addQuestionArea");

        if (area) {

            area.classList.add(
                "hidden"
            );

            area.innerHTML = "";

        }

    }


    /* =====================================================
    SAVE MCQ QUESTION
    ===================================================== */

    function saveMCQQuestion(testId) {

        const test =
            tests.find(
                item => item.id === testId
            );


        if (!test) {
            return;
        }


        const text =
            $("newQuestionText")?.value.trim();


        const options = [

            $("newOption0")?.value.trim(),

            $("newOption1")?.value.trim(),

            $("newOption2")?.value.trim(),

            $("newOption3")?.value.trim()

        ];


        const correctAnswer =
            Number(
                $("newCorrectAnswer")?.value
            );


        if (
            !text ||
            options.some(
                option => !option
            )
        ) {

            alert(
                "Please enter the question and all four options."
            );

            return;
        }


        const question = {

            id:
                generateId("Q"),

            type:
                "mcq",

            text:
                text,

            options:
                options,

            correctAnswer:
                correctAnswer,

            marks:
                1

        };


        if (!Array.isArray(test.questions)) {

            test.questions = [];

        }


        test.questions.push(
            question
        );


        saveLocalData();


        alert(
            "MCQ question added successfully!"
        );


        showQuestionManagerModal(
            test
        );

    }


    /* =====================================================
    SAVE CODING QUESTION
    ===================================================== */

    function saveCodingQuestion(testId) {

        const test =
            tests.find(
                item => item.id === testId
            );


        if (!test) {
            return;
        }


        const title =
            $("codingQuestionTitle")?.value.trim();


        const text =
            $("codingQuestionText")?.value.trim();


        const sampleInput =
            $("codingSampleInput")?.value.trim();


        const sampleOutput =
            $("codingSampleOutput")?.value.trim();


        if (
            !title ||
            !text
        ) {

            alert(
                "Please enter the coding problem title and statement."
            );

            return;
        }


        /* =========================
        COLLECT TEST CASES
        ========================= */

        const testCaseElements =
            document.querySelectorAll(
                "#codingTestCases .coding-test-case"
            );


        const testCases = [];


        testCaseElements.forEach(
            (testCaseElement, index) => {

                const input =
                    testCaseElement
                        .querySelector(
                            ".coding-test-input"
                        )
                        ?.value.trim() || "";


                const output =
                    testCaseElement
                        .querySelector(
                            ".coding-test-output"
                        )
                        ?.value.trim() || "";


                if (
                    input ||
                    output
                ) {

                    testCases.push({

                        id:
                            generateId("TC"),

                        input:
                            input,

                        output:
                            output

                    });

                }

            }
        );


        /* =========================
        CREATE QUESTION
        ========================= */

        const question = {

            id:
                generateId("Q"),

            type:
                "coding",

            title:
                title,

            text:
                text,

            sampleInput:
                sampleInput,

            sampleOutput:
                sampleOutput,

            testCases:
                testCases,

            marks:
                10

        };


        if (!Array.isArray(test.questions)) {

            test.questions = [];

        }


        test.questions.push(
            question
        );


        /* =========================
        SAVE
        ========================= */

        saveLocalData();


        alert(
            "Coding question added successfully!"
        );


        showQuestionManagerModal(
            test
        );

    }
    function addEditCodingTestCase() {

        const container =
            $("editCodingTestCases");

        if (!container) {
            return;
        }


        const testCaseNumber =
            container.querySelectorAll(
                ".coding-test-case"
            ).length + 1;


        const testCase =
            document.createElement("div");

        testCase.className =
            "coding-test-case";


        testCase.innerHTML = `

            <div class="test-case-header">

                <strong>
                    Test Case ${testCaseNumber}
                </strong>

                <button
                    type="button"
                    class="danger-btn"
                    onclick="this.closest('.coding-test-case').remove()"
                >
                    Delete
                </button>

            </div>


            <div class="form-row">

                <div class="form-group">

                    <label>
                        Input
                    </label>

                    <textarea
                        class="edit-coding-test-input"
                        rows="3"
                        placeholder="Test input..."
                    ></textarea>

                </div>


                <div class="form-group">

                    <label>
                        Output
                    </label>

                    <textarea
                        class="edit-coding-test-output"
                        rows="3"
                        placeholder="Expected output..."
                    ></textarea>

                </div>

            </div>

        `;


        container.appendChild(testCase);

    }
    /* =====================================================
    SAVE EDITED QUESTION
    ===================================================== */

    function saveEditedQuestion(testId, questionId) {

        const test = tests.find(
            item => item.id === testId
        );

        if (!test) {
            return;
        }

        const question = test.questions.find(
            item => item.id === questionId
        );

        if (!question) {
            return;
        }


        /* =========================
        EDIT MCQ
        ========================= */

        if (question.type === "mcq") {

            const text =
                $("editQuestionText")?.value.trim();

            const options = [
                $("editOption0")?.value.trim(),
                $("editOption1")?.value.trim(),
                $("editOption2")?.value.trim(),
                $("editOption3")?.value.trim()
            ];

            const correctAnswer =
                Number(
                    $("editCorrectAnswer")?.value
                );


            if (
                !text ||
                options.some(
                    option => !option
                )
            ) {

                alert(
                    "Please enter the question and all four options."
                );

                return;
            }


            question.text =
                text;

            question.options =
                options;

            question.correctAnswer =
                correctAnswer;

        }


        /* =========================
        EDIT CODING
        ========================= */

        if (question.type === "coding") {

        const title =
            $("editCodingTitle")?.value.trim();

        const text =
            $("editCodingText")?.value.trim();

        const sampleInput =
            $("editCodingInput")?.value.trim();

        const sampleOutput =
            $("editCodingOutput")?.value.trim();


        if (!title || !text) {

            alert(
                "Please enter the coding problem title and statement."
            );

            return;
        }


        /* =========================
        COLLECT EDITED TEST CASES
        ========================= */

        const testCaseElements =
            document.querySelectorAll(
                "#editCodingTestCases .coding-test-case"
            );


        const testCases = [];


        testCaseElements.forEach(
            testCaseElement => {

                const input =
                    testCaseElement
                        .querySelector(
                            ".edit-coding-test-input"
                        )
                        ?.value.trim() || "";


                const output =
                    testCaseElement
                        .querySelector(
                            ".edit-coding-test-output"
                        )
                        ?.value.trim() || "";


                if (
                    input ||
                    output
                ) {

                    testCases.push({

                        id:
                            generateId("TC"),

                        input:
                            input,

                        output:
                            output

                    });

                }

            }
        );


        /* =========================
        UPDATE CODING QUESTION
        ========================= */

        question.title =
            title;

        question.text =
            text;

        question.sampleInput =
            sampleInput;

        question.sampleOutput =
            sampleOutput;

        question.testCases =
            testCases;

    }
        /* =========================
        SAVE
        ========================= */

        saveLocalData();


        alert(
            "Question updated successfully!"
        );


        /* =========================
        REFRESH QUESTION MANAGER
        ========================= */

        showQuestionManagerModal(
            test
        );

        renderAdminTests();

    }

    /* =====================================================
    DELETE QUESTION
    ===================================================== */

    function deleteQuestion(
        testId,
        questionId
    ) {

        const test =
            tests.find(
                item => item.id === testId
            );


        if (!test) {
            return;
        }


        const confirmed =
            confirm(
                "Are you sure you want to delete this question?"
            );


        if (!confirmed) {
            return;
        }


        test.questions =
            test.questions.filter(
                question =>
                    question.id !== questionId
            );


        saveLocalData();


        showQuestionManagerModal(
            test
        );


        renderAdminTests();

    }
    /* =====================================================
    EDIT QUESTION
    ===================================================== */

    /* =====================================================
    EDIT QUESTION
    ===================================================== */

    function editQuestion(testId, questionId) {

        const test = tests.find(
            item => item.id === testId
        );

        if (!test) {
            return;
        }

        const question = test.questions.find(
            item => item.id === questionId
        );

        if (!question) {
            return;
        }

        const modal = $("questionManagerModal");

        if (!modal) {
            return;
        }

        const area = modal.querySelector(".add-question-area");

        if (!area) {
            return;
        }

        area.classList.remove("hidden");

        /* =========================
        EDIT MCQ
        ========================= */

        if (question.type === "mcq") {

            area.innerHTML = `

                <div class="add-question-card">

                    <div class="card-header">

                        <div>

                            <h3>
                                Edit MCQ Question
                            </h3>

                            <p>
                                Update question, options or correct answer.
                            </p>

                        </div>

                    </div>


                    <div class="form-group">

                        <label>
                            Question
                        </label>

                        <textarea
                            id="editQuestionText"
                            rows="4"
                        >${escapeHTML(question.text || "")}</textarea>

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label>
                                Option A
                            </label>

                            <input
                                type="text"
                                id="editOption0"
                                value="${escapeHTML(question.options?.[0] || "")}"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Option B
                            </label>

                            <input
                                type="text"
                                id="editOption1"
                                value="${escapeHTML(question.options?.[1] || "")}"
                            >

                        </div>

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label>
                                Option C
                            </label>

                            <input
                                type="text"
                                id="editOption2"
                                value="${escapeHTML(question.options?.[2] || "")}"
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Option D
                            </label>

                            <input
                                type="text"
                                id="editOption3"
                                value="${escapeHTML(question.options?.[3] || "")}"
                            >

                        </div>

                    </div>


                    <div class="form-group">

                        <label>
                            Correct Answer
                        </label>

                        <select id="editCorrectAnswer">

                            <option value="0"
                                ${question.correctAnswer === 0 ? "selected" : ""}>
                                Option A
                            </option>

                            <option value="1"
                                ${question.correctAnswer === 1 ? "selected" : ""}>
                                Option B
                            </option>

                            <option value="2"
                                ${question.correctAnswer === 2 ? "selected" : ""}>
                                Option C
                            </option>

                            <option value="3"
                                ${question.correctAnswer === 3 ? "selected" : ""}>
                                Option D
                            </option>

                        </select>

                    </div>


                    <div class="form-actions">

                        <button
                            type="button"
                            class="secondary-btn"
                            onclick="showQuestionManagerModal(
                                tests.find(item => item.id === '${testId}')
                            )"
                        >
                            Cancel
                        </button>


                        <button
                            type="button"
                            class="primary-btn"
                            onclick="saveEditedQuestion(
                                '${testId}',
                                '${questionId}'
                            )"
                        >
                            Save Changes
                        </button>

                    </div>

                </div>

            `;

            return;
        }


        /* =========================
        EDIT CODING QUESTION
        ========================= */

        if (question.type === "coding") {

        area.innerHTML = `

            <div class="add-question-card">

                <div class="card-header">

                    <div>

                        <h3>
                            Edit Coding Question
                        </h3>

                        <p>
                            Update the coding problem
                            and test cases.
                        </p>

                    </div>

                </div>


                <div class="form-group">

                    <label>
                        Problem Title
                    </label>

                    <input
                        type="text"
                        id="editCodingTitle"
                        value="${escapeHTML(question.title || "")}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Problem Statement
                    </label>

                    <textarea
                        id="editCodingText"
                        rows="6"
                    >${escapeHTML(question.text || "")}</textarea>

                </div>


                <div class="form-group">

                    <label>
                        Sample Input
                    </label>

                    <textarea
                        id="editCodingInput"
                        rows="3"
                    >${escapeHTML(question.sampleInput || "")}</textarea>

                </div>


                <div class="form-group">

                    <label>
                        Sample Output
                    </label>

                    <textarea
                        id="editCodingOutput"
                        rows="3"
                    >${escapeHTML(question.sampleOutput || "")}</textarea>

                </div>


                <!-- =========================
                    TEST CASES
                ========================== -->

                <div class="test-cases-section">

                    <div class="card-header">

                        <div>

                            <h3>
                                Test Cases
                            </h3>

                            <p>
                                Edit existing cases or
                                add new ones.
                            </p>

                        </div>


                        <button
                            type="button"
                            class="outline-btn"
                            onclick="addEditCodingTestCase()"
                        >
                            + Add Test Case
                        </button>

                    </div>


                    <div id="editCodingTestCases">

                        ${
                            (question.testCases || []).length === 0

                            ?

                            `
                            <div class="coding-test-case">

                                <div class="test-case-header">

                                    <strong>
                                        Test Case 1
                                    </strong>

                                </div>


                                <div class="form-row">

                                    <div class="form-group">

                                        <label>
                                            Input
                                        </label>

                                        <textarea
                                            class="edit-coding-test-input"
                                            rows="3"
                                            placeholder="Test input..."
                                        ></textarea>

                                    </div>


                                    <div class="form-group">

                                        <label>
                                            Output
                                        </label>

                                        <textarea
                                            class="edit-coding-test-output"
                                            rows="3"
                                            placeholder="Expected output..."
                                        ></textarea>

                                    </div>

                                </div>

                            </div>
                            `

                            :

                            (question.testCases || [])
                                .map(
                                    (testCase, index) => `

                                        <div
                                            class="coding-test-case"
                                        >

                                            <div
                                                class="test-case-header"
                                            >

                                                <strong>
                                                    Test Case
                                                    ${index + 1}
                                                </strong>


                                                <button
                                                    type="button"
                                                    class="danger-btn"
                                                    onclick="this.closest('.coding-test-case').remove()"
                                                >
                                                    Delete
                                                </button>

                                            </div>


                                            <div class="form-row">

                                                <div class="form-group">

                                                    <label>
                                                        Input
                                                    </label>

                                                    <textarea
                                                        class="edit-coding-test-input"
                                                        rows="3"
                                                    >${escapeHTML(testCase.input || "")}</textarea>

                                                </div>


                                                <div class="form-group">

                                                    <label>
                                                        Output
                                                    </label>

                                                    <textarea
                                                        class="edit-coding-test-output"
                                                        rows="3"
                                                    >${escapeHTML(testCase.output || "")}</textarea>

                                                </div>

                                            </div>

                                        </div>

                                    `
                                )
                                .join("")
                        }

                    </div>

                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        class="secondary-btn"
                        onclick="showQuestionManagerModal(
                            tests.find(item => item.id === '${testId}')
                        )"
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        class="primary-btn"
                        onclick="saveEditedQuestion(
                            '${testId}',
                            '${questionId}'
                        )"
                    >
                        Save Changes
                    </button>

                </div>

            </div>

        `;

    }
    }

    /* =====================================================
    CLOSE QUESTION MANAGER
    ===================================================== */

    function closeQuestionManager() {

        const modal =
            $("questionManagerModal");


        if (modal) {

            modal.remove();

        }

    }


    /* =====================================================
    ADMIN RESULTS
    ===================================================== */

    function loadAdminResults() {

        const container =
            $("adminResults");


        if (!container) {
            return;
        }


        if (submissions.length === 0) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        🏆
                    </div>

                    <h4>
                        No Results Available
                    </h4>

                    <p>
                        Candidate results will appear here
                        after test submissions.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            submissions
                .map(
                    submission => {

                        return `

                            <div class="data-item">

                                <div class="data-main">

                                    <h4>
                                        ${escapeHTML(
                                            submission.candidateName ||
                                            "Candidate"
                                        )}
                                    </h4>

                                    <p>
                                        ${escapeHTML(
                                            submission.testTitle ||
                                            "Test"
                                        )}
                                    </p>

                                    <div class="data-meta">

                                        <span>
                                            Student ID:
                                            ${
                                                escapeHTML(
                                                    submission.studentId ||
                                                    "-"
                                                )
                                            }
                                        </span>

                                        <span>
                                            Score:
                                            ${
                                                submission.score
                                            }
                                            /
                                            ${
                                                submission.totalMarks
                                            }
                                        </span>

                                        <span>
                                            ${
                                                submission.percentage
                                            }%
                                        </span>

                                    </div>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
    ADMIN ACTIVITY LOGS
    ===================================================== */

    function renderAdminActivityLogs() {

        const container =
            $("adminActivityLogs");


        if (!container) {
            return;
        }


        if (activityLogs.length === 0) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        🛡️
                    </div>

                    <h4>
                        No Activity Logs
                    </h4>

                    <p>
                        Test activity and violation
                        records will appear here.
                    </p>

                </div>

            `;

            return;
        }


        const latestLogs =
            [...activityLogs]
                .reverse()
                .slice(0, 50);


        container.innerHTML =
            latestLogs
                .map(
                    log => {

                        return `

                            <div class="data-item">

                                <div class="data-main">

                                    <h4>
                                        ${
                                            escapeHTML(
                                                log.type ||
                                                "Activity"
                                            )
                                        }
                                    </h4>

                                    <p>
                                        ${
                                            escapeHTML(
                                                log.message ||
                                                "Activity recorded."
                                            )
                                        }
                                    </p>

                                    <div class="data-meta">

                                        <span>
                                            Candidate:
                                            ${
                                                escapeHTML(
                                                    log.candidateName ||
                                                    "-"
                                                )
                                            }
                                        </span>

                                        <span>
                                            ${
                                                formatDate(
                                                    log.timestamp
                                                )
                                            }
                                        </span>

                                    </div>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
    CLOSE MODAL WHEN CLICKING OUTSIDE
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            const modal =
                $("questionManagerModal");


            if (
                modal &&
                event.target === modal
            ) {

                closeQuestionManager();

            }

        }
    );
    /* =====================================================
    PART 2D
    CANDIDATE DASHBOARD + HISTORY
    ===================================================== */


    /* =====================================================
    LOAD CANDIDATE DASHBOARD
    ===================================================== */

    function loadCandidateDashboard() {

        if (!currentUser) {
            return;
        }
        if(typeof closeQuestionManager === "function") {
            closeQuestionManager();
        }

        const name =
            $("candidateDashboardName");


        if (name) {

            name.textContent =
                currentUser.name ||
                "Candidate";

        }


        const availableTests =
            $("candidateAvailableTests");


        if (availableTests) {

            availableTests.textContent =
                tests.length;

        }


        const mySubmissions =
            submissions.filter(
                submission =>
                    submission.candidateId ===
                    currentUser.id
            );


        const submittedTests =
            $("candidateSubmittedTests");


        if (submittedTests) {

            submittedTests.textContent =
                mySubmissions.length;

        }


        const averageScore =
            $("candidateAverageScore");


        if (averageScore) {

            if (
                mySubmissions.length === 0
            ) {

                averageScore.textContent =
                    "0%";

            }

            else {

                const total =
                    mySubmissions.reduce(
                        (
                            sum,
                            item
                        ) =>
                            sum +
                            Number(
                                item.percentage || 0
                            ),
                        0
                    );


                averageScore.textContent =
                    Math.round(
                        total /
                        mySubmissions.length
                    ) +
                    "%";

            }

        }


        const myViolations =
            activityLogs.filter(
                log =>
                    log.candidateId ===
                    currentUser.id &&
                    log.type === "violation"
            );


        const violationElement =
            $("candidateViolationCount");


        if (violationElement) {

            violationElement.textContent =
                myViolations.length;

        }


        renderCandidateTests();

        renderCandidateHistory();

    }


    /* =====================================================
    RENDER CANDIDATE TESTS
    ===================================================== */

    function renderCandidateTests() {

        const container =
            $("candidateTestList");


        if (!container) {
            return;
        }


        if (tests.length === 0) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        📚
                    </div>

                    <h4>
                        No Tests Available
                    </h4>

                    <p>
                        Tests assigned to you
                        will appear here.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            tests.map(test => {

                const alreadySubmitted =
                    submissions.some(
                        submission =>
                            submission.testId ===
                            test.id &&
                            submission.candidateId ===
                            currentUser?.id
                    );


                const questionCount =
                    Array.isArray(test.questions)
                        ? test.questions.length
                        : 0;


                return `

                    <div class="test-card">

                        <div class="test-card-icon">

                            ${
                                test.type === "coding"
                                ? "💻"
                                : test.type === "mixed"
                                ? "🧠"
                                : "📝"
                            }

                        </div>


                        <div class="test-card-content">

                            <h3>
                                ${escapeHTML(
                                    test.title
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    test.description ||
                                    "Online assessment"
                                )}
                            </p>


                            <div class="data-meta">

                            <span>
                                📅
                                ${
                                test.startDateTime
                                ? new Date(test.startDateTime).toLocaleString()
                                : "Not Scheduled"
                                }
                                </span>

                                <span>
                                    ⏰
                                    ${getStudentTestStatus(test)}
                                </span>

                                <span>
                                    ⏱️
                                    ${test.duration}
                                    min
                                </span>

                                <span>
                                    🎯
                                    ${test.totalMarks}
                                    marks
                                </span>

                                <span>
                                    ❓
                                    ${questionCount}
                                    questions
                                </span>

                            </div>

                        </div>


                        <div class="test-card-action">

                            ${
                                alreadySubmitted

                                ?

                                `
                                <button
                                    class="secondary-btn"
                                    disabled
                                >
                                    ✓ Submitted
                                </button>
                                `

                                :

                                `
                                ${
        getStudentTestStatus(test) === "Live"
            ? `
                <button
                    class="primary-btn"
                    onclick="startTest('${test.id}')"
                >
                    Start Test
                </button>
            `
            : `
                <button
                    class="secondary-btn"
                    disabled
                >
                    ${
                        getStudentTestStatus(test) === "Upcoming"
                            ? "Test Not Started"
                            : "Test Ended"
                    }
                </button>
            `
    }
                                `

                            }

                        </div>

                    </div>

                `;

            }).join("");

    }


    /* =====================================================
    LOAD CANDIDATE HISTORY
    ===================================================== */

    function loadCandidateHistory() {

        if (!currentUser) {
            return;
        }


        renderCandidateHistory();


        showSection(
            "candidateDashboard"
        );


        const history =
            $("candidateHistory");


        if (history) {

            history.scrollIntoView({
                behavior: "smooth"
            });

        }

    }


    /* =====================================================
    RENDER CANDIDATE HISTORY
    ===================================================== */

    function renderCandidateHistory() {

        const container =
            $("candidateHistory");


        if (
            !container ||
            !currentUser
        ) {

            return;

        }


        const mySubmissions =
            submissions.filter(
                submission =>
                    submission.candidateId ===
                    currentUser.id
            );


        if (mySubmissions.length === 0) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        📊
                    </div>

                    <h4>
                        No Submission History
                    </h4>

                    <p>
                        Your completed assessments
                        will appear here.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            [...mySubmissions]
                .reverse()
                .map(
                    submission => {

                        return `

                            <div class="data-item">

                                <div class="data-main">

                                    <h4>
                                        ${escapeHTML(
                                            submission.testTitle ||
                                            "Assessment"
                                        )}
                                    </h4>

                                    <p>
                                        Submitted:
                                        ${
                                            formatDate(
                                                submission.submittedAt
                                            )
                                        }
                                    </p>

                                    <div class="data-meta">

                                        <span>
                                            Score:
                                            ${
                                                submission.score
                                            }
                                            /
                                            ${
                                                submission.totalMarks
                                            }
                                        </span>

                                        <span>
                                            Correct:
                                            ${
                                                submission.correct
                                            }
                                        </span>

                                        <span>
                                            Wrong:
                                            ${
                                                submission.wrong
                                            }
                                        </span>

                                        <span>
                                            Unanswered:
                                            ${
                                                submission.unanswered
                                            }
                                        </span>

                                        <span>
                                            ${
                                                submission.percentage
                                            }%
                                        </span>

                                    </div>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
    ESCAPE HTML
    ===================================================== */

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =====================================================
    FORMAT DATE
    ===================================================== */

    function formatDate(timestamp) {

        if (!timestamp) {
            return "-";
        }


        try {

            return new Date(
                timestamp
            ).toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );

        }

        catch (error) {

            return "-";

        }

    }
    /* =====================================================
    PART 3A
    TEST START + QUESTION PREPARATION
    ===================================================== */


    /* =====================================================
    START TEST
    ===================================================== */

    function startTest(testId) {

        const test =
            tests.find(
                item => item.id === testId
            );


        if (!test) {

            alert(
                "Test not found."
            );

            return;
        }
        const status =
        getStudentTestStatus(test);

        if (status !== "Live") {

            alert(
                status === "Upcoming"
                    ? "This test has not started yet."
                    : "This test has already ended."
            );

            return;
    }


        if (!currentUser) {

            alert(
                "Please login first."
            );

            showSection("login");

            return;
        }


        if (
            !Array.isArray(test.questions) ||
            test.questions.length === 0
        ) {

            alert(
                "This test does not have any questions yet."
            );

            return;
        }


        const alreadySubmitted =
            submissions.some(
                submission =>
                    submission.testId ===
                    test.id &&
                    submission.candidateId ===
                    currentUser.id
            );


        if (alreadySubmitted) {

            alert(
                "You have already submitted this test."
            );

            return;
        }


        const confirmed =
            confirm(
                `Start "${test.title}"?\n\n` +
                `Duration: ${test.duration} minutes\n` +
                `Questions: ${test.questions.length}\n\n` +
                "Once started, the timer will begin."
            );


        if (!confirmed) {
            return;
        }


    activeTest = 
            JSON.parse(
                JSON.stringify(test)     
        ); 
        /* ---------------------------------------------
        PREPARE QUESTIONS
        --------------------------------------------- */

        prepareTestQuestions();


        /* ---------------------------------------------
        RESET TEST STATE
        --------------------------------------------- */

        currentQuestionIndex = 0;

        userAnswers = {};

        violationCount = 0;

        testStarted = true;


        /* ---------------------------------------------
        SET TIMER
        --------------------------------------------- */

        remainingSeconds =
            Number(test.duration) * 60;


        /* ---------------------------------------------
        SHOW TEST PAGE
        --------------------------------------------- */

        showSection("testPage");


        /* ---------------------------------------------
        UPDATE TEST TITLE
        --------------------------------------------- */

        const title =
            $("activeTestTitle");


        if (title) {

            title.textContent =
                test.title;

        }


        /* ---------------------------------------------
        START TEST TIMER
        --------------------------------------------- */

        startTimer();


        /* ---------------------------------------------
        DISPLAY FIRST QUESTION
        --------------------------------------------- */

        renderCurrentQuestion();


        /* ---------------------------------------------
        QUESTION PALETTE
        --------------------------------------------- */

        renderQuestionPalette();


        /* ---------------------------------------------
        START MONITORING
        --------------------------------------------- */

        startTestEnvironment();

    }


    /* =====================================================
    PREPARE TEST QUESTIONS
    ===================================================== */

    function prepareTestQuestions() {

        if (!activeTest) {
            return;
        }


        const originalQuestions =
            Array.isArray(
                activeTest.questions
            )
                ? activeTest.questions
                : [];


        /*
        IMPORTANT:

        We create a new array instead of changing
        the admin's original saved questions.

        Therefore every candidate can receive
        the same questions in a different order.
        */

        let preparedQuestions =
            originalQuestions.map(
                question => {

                    const copy = {
                        ...question
                    };


                    /* ---------------------------------
                    SHUFFLE MCQ OPTIONS
                    --------------------------------- */

                    if (
                        copy.type === "mcq" &&
                        Array.isArray(copy.options)
                    ) {

                        const correctOption =
                            copy.options[
                                copy.correctAnswer
                            ];


                        const shuffledOptions =
                            [...copy.options];


                        shuffleArray(
                            shuffledOptions
                        );


                        copy.options =
                            shuffledOptions;


                        /*
                        Find the new position of
                        the original correct answer.
                        */

                        copy.correctAnswer =
                            shuffledOptions.indexOf(
                                correctOption
                            );

                    }


                    return copy;

                }
            );


        /* ---------------------------------------------
        SHUFFLE QUESTION ORDER
        --------------------------------------------- */

        shuffleArray(
            preparedQuestions
        );


        /*
        Store shuffled questions separately.

        activeTest.questions remains unchanged.
        */

        activeTest =
            {
                ...activeTest,
                questions:
                    preparedQuestions
            };

    }


    /* =====================================================
    SHUFFLE ARRAY
    ===================================================== */

    function shuffleArray(array) {

        for (
            let i = array.length - 1;
            i > 0;
            i--
        ) {

            const randomIndex =
                Math.floor(
                    Math.random() *
                    (i + 1)
                );


            const temp =
                array[i];


            array[i] =
                array[randomIndex];


            array[randomIndex] =
                temp;

        }


        return array;

    }


    /* =====================================================
    PREPARE ANSWER STORAGE
    ===================================================== */

    function initializeAnswers() {

        userAnswers = {};


        if (
            !activeTest ||
            !Array.isArray(activeTest.questions)
        ) {

            return;
        }


        activeTest.questions.forEach(
            (
                question,
                index
            ) => {

                userAnswers[index] =
                    null;

            }
        );

    }


    /* =====================================================
    GET CURRENT QUESTION
    ===================================================== */

    function getCurrentQuestion() {

        if (
            !activeTest ||
            !Array.isArray(activeTest.questions)
        ) {

            return null;
        }


        return activeTest.questions[
            currentQuestionIndex
        ] || null;

    }


    /* =====================================================
    CHECK TEST STATE
    ===================================================== */

    function isTestRunning() {

        return (
            testStarted &&
            activeTest !== null
        );

    }
    /* =====================================================
    PART 3B
    QUESTION DISPLAY + MCQ ANSWERS
    ===================================================== */


    /* =====================================================
    RENDER CURRENT QUESTION
    ===================================================== */

    function renderCurrentQuestion() {

        if (!isTestRunning()) {
            return;
        }


        const question =
            getCurrentQuestion();


        if (!question) {

            alert(
                "No question available."
            );

            return;
        }


        /* ---------------------------------------------
        QUESTION NUMBER
        --------------------------------------------- */

        const number =
            $("currentQuestionNumber");


        if (number) {

            number.textContent =
                `Question ${
                    currentQuestionIndex + 1
                }`;

        }


        /* ---------------------------------------------
        QUESTION MARKS
        --------------------------------------------- */

        const marks =
            $("currentQuestionMarks");


        if (marks) {

            marks.textContent =
                `${question.marks || 1} Mark`;

        }


        /* ---------------------------------------------
        QUESTION TEXT
        --------------------------------------------- */

        const questionText =
            $("questionText");


        if (questionText) {

            questionText.textContent =
                question.text ||
                question.title ||
                "Question";

        }


        /* ---------------------------------------------
        MCQ / CODING DISPLAY
        --------------------------------------------- */

        const mcqOptions =
            $("mcqOptions");


        const codingArea =
            $("codingArea");


        if (question.type === "mcq") {

            if (mcqOptions) {

                mcqOptions.classList.remove(
                    "hidden"
                );

            }


            if (codingArea) {

                codingArea.classList.add(
                    "hidden"
                );

            }


            renderMCQOptions(
                question
            );

        }

        else {

            if (mcqOptions) {

                mcqOptions.classList.add(
                    "hidden"
                );

            }


            if (codingArea) {

                codingArea.classList.remove(
                    "hidden"
                );

            }


            renderCodingQuestion(
                question
            );

        }


        /* ---------------------------------------------
        BUTTON STATES
        --------------------------------------------- */

        updateQuestionButtons();


        /* ---------------------------------------------
        PALETTE
        --------------------------------------------- */

        renderQuestionPalette();

    }


    /* =====================================================
    RENDER MCQ OPTIONS
    ===================================================== */

    function renderMCQOptions(question) {

        if (!Array.isArray(question.options)) {
            return;
        }


        for (
            let i = 0;
            i < 4;
            i++
        ) {

            const optionText =
                $(`optionText${i}`);


            const radio =
                document.querySelector(
                    `input[name="answer"][value="${i}"]`
                );


            if (optionText) {

                optionText.textContent =
                    question.options[i] ||
                    "";

            }


            if (radio) {

                radio.checked =
                    userAnswers[
                        currentQuestionIndex
                    ] === i;

            }

        }


        /*
        Add/change answer listener.

        We remove old listeners by replacing
        each radio element with a clone.
        */

        const radios =
            document.querySelectorAll(
                'input[name="answer"]'
            );


        radios.forEach(
            radio => {

                const newRadio =
                    radio.cloneNode(true);


                radio.parentNode.replaceChild(
                    newRadio,
                    radio
                );


                newRadio.addEventListener(
                    "change",
                    function () {

                        saveMCQAnswer(
                            Number(
                                this.value
                            )
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
    SAVE MCQ ANSWER
    ===================================================== */

    function saveMCQAnswer(answerIndex) {

        if (!isTestRunning()) {
            return;
        }


        userAnswers[
            currentQuestionIndex
        ] = answerIndex;


        renderQuestionPalette();

    }


    /* =====================================================
    CLEAR ANSWER
    ===================================================== */

    function clearAnswer() {

        if (!isTestRunning()) {
            return;
        }


        const question =
            getCurrentQuestion();


        if (!question) {
            return;
        }


        userAnswers[
            currentQuestionIndex
        ] = null;


        if (question.type === "mcq") {

            const radios =
                document.querySelectorAll(
                    'input[name="answer"]'
                );


            radios.forEach(
                radio => {

                    radio.checked =
                        false;

                }
            );

        }


        if (question.type === "coding") {

            const editor =
                $("codeEditor");


            if (editor) {

                editor.value = "";

            }

        }


        renderQuestionPalette();

    }


    /* =====================================================
    UPDATE QUESTION BUTTONS
    ===================================================== */

    function updateQuestionButtons() {

        const previousButton =
            $("previousQuestionBtn");


        const nextButton =
            $("nextQuestionBtn");


        if (previousButton) {

            previousButton.disabled =
                currentQuestionIndex === 0;

        }


        if (nextButton) {

            if (
                activeTest &&
                currentQuestionIndex ===
                    activeTest.questions.length - 1
            ) {

                nextButton.textContent =
                    "Review →";

            }

            else {

                nextButton.textContent =
                    "Next →";

            }

        }

    }


    /* =====================================================
    RENDER CODING QUESTION
    ===================================================== */

    function renderCodingQuestion(question) {

        const problemText =
            $("codingProblemText");


        if (problemText) {

            problemText.textContent =
                question.text ||
                "Coding problem";

        }


        const editor =
            $("codeEditor");


        if (editor) {

            editor.value =
                userAnswers[
                    currentQuestionIndex
                ] || "";

        }


        const output =
            $("outputText");


        if (output) {

            output.textContent =
                "No output yet.";

        }

    }
    /* =====================================================
    PART 3C
    NEXT / PREVIOUS + QUESTION PALETTE
    ===================================================== */


    /* =====================================================
    NEXT QUESTION
    ===================================================== */

    function nextQuestion() {

        if (!isTestRunning()) {
            return;
        }


        saveCurrentQuestionData();


        if (
            currentQuestionIndex <
            activeTest.questions.length - 1
        ) {

            currentQuestionIndex++;

            renderCurrentQuestion();

            return;

        }


        /*
        Last question reached.
        Ask candidate whether they want
        to submit the test.
        */

        const confirmed =
            confirm(
                "You have reached the last question.\n\n" +
                "Do you want to submit the test now?"
            );


        if (confirmed) {

            submitTest();

        }

    }


    /* =====================================================
    PREVIOUS QUESTION
    ===================================================== */

    function previousQuestion() {

        if (!isTestRunning()) {
            return;
        }


        saveCurrentQuestionData();


        if (
            currentQuestionIndex > 0
        ) {

            currentQuestionIndex--;

            renderCurrentQuestion();

        }

    }


    /* =====================================================
    SAVE CURRENT QUESTION DATA
    ===================================================== */

    function saveCurrentQuestionData() {

        const question =
            getCurrentQuestion();


        if (!question) {
            return;
        }


        /* ---------------------------------------------
        MCQ
        --------------------------------------------- */

        if (question.type === "mcq") {

            const selected =
                document.querySelector(
                    'input[name="answer"]:checked'
                );


            if (selected) {

                userAnswers[
                    currentQuestionIndex
                ] =
                    Number(
                        selected.value
                    );

            }

        }


        /* ---------------------------------------------
        CODING
        --------------------------------------------- */

        if (question.type === "coding") {

            const editor =
                $("codeEditor");


            if (editor) {

                userAnswers[
                    currentQuestionIndex
                ] =
                    editor.value;

            }

        }

    }


    /* =====================================================
    RENDER QUESTION PALETTE
    ===================================================== */

    function renderQuestionPalette() {

        const palette =
            $("questionPalette");


        const progress =
            $("paletteProgress");


        if (
            !palette ||
            !activeTest ||
            !Array.isArray(
                activeTest.questions
            )
        ) {

            return;
        }


        const questions =
            activeTest.questions;


        /* ---------------------------------------------
        PROGRESS
        --------------------------------------------- */

        const answeredCount =
            questions.reduce(
                (
                    count,
                    question,
                    index
                ) => {

                    const answer =
                        userAnswers[index];


                    if (
                        answer !== null &&
                        answer !== undefined &&
                        answer !== ""
                    ) {

                        return count + 1;

                    }


                    return count;

                },
                0
            );


        if (progress) {

            progress.textContent =
                `${answeredCount} / ${questions.length}`;

        }


        /* ---------------------------------------------
        CREATE PALETTE
        --------------------------------------------- */

        palette.innerHTML =
            questions
                .map(
                    (
                        question,
                        index
                    ) => {

                        const answer =
                            userAnswers[index];


                        const answered =
                            answer !== null &&
                            answer !== undefined &&
                            answer !== "";


                        let className =
                            "palette-question";


                        if (answered) {

                            className +=
                                " answered";

                        }


                        if (
                            index ===
                            currentQuestionIndex
                        ) {

                            className +=
                                " current";

                        }


                        return `

                            <button
                                type="button"
                                class="${className}"
                                onclick="goToQuestion(${index})"
                            >
                                ${index + 1}
                            </button>

                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
    GO TO QUESTION
    ===================================================== */

    function goToQuestion(index) {

        if (!isTestRunning()) {
            return;
        }


        saveCurrentQuestionData();


        if (
            index < 0 ||
            index >=
            activeTest.questions.length
        ) {

            return;

        }


        currentQuestionIndex =
            index;


        renderCurrentQuestion();

    }


    /* =====================================================
    UPDATE TIMER DISPLAY
    ===================================================== */

    function updateTimerDisplay() {

        const timer =
            $("testTimer");


        if (!timer) {
            return;
        }


        const minutes =
            Math.floor(
                remainingSeconds / 60
            );


        const seconds =
            remainingSeconds % 60;


        timer.textContent =
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`;


        /*
        Visual warning when less than
        one minute remains.
        */

        if (
            remainingSeconds <= 60
        ) {

            timer.classList.add(
                "timer-warning"
            );

        }

        else {

            timer.classList.remove(
                "timer-warning"
            );

        }

    }
    /* =====================================================
    PART 3D
    TIMER + AUTO SUBMIT
    ===================================================== */


    /* =====================================================
    START TIMER
    ===================================================== */

    function startTimer() {

        stopTimer();


        updateTimerDisplay();


        timerInterval =
            setInterval(
                function () {

                    if (!testStarted) {

                        stopTimer();

                        return;

                    }


                    remainingSeconds--;


                    updateTimerDisplay();


                    /* ---------------------------------
                    TIME FINISHED
                    --------------------------------- */

                    if (
                        remainingSeconds <= 0
                    ) {

                        remainingSeconds = 0;

                        updateTimerDisplay();

                        stopTimer();


                        alert(
                            "Time is over!\n\n" +
                            "Your test will be submitted automatically."
                        );


                        submitTest(
                            true
                        );

                    }

                },
                1000
            );

    }


    /* =====================================================
    STOP TIMER
    ===================================================== */

    function stopTimer() {

        if (timerInterval) {

            clearInterval(
                timerInterval
            );

            timerInterval =
                null;

        }

    }


    /* =====================================================
    GET REMAINING TIME
    ===================================================== */

    function getRemainingTime() {

        return remainingSeconds;

    }


    /* =====================================================
    FORMAT TEST TIME
    ===================================================== */

    function formatTestTime(
        totalSeconds
    ) {

        const minutes =
            Math.floor(
                totalSeconds / 60
            );


        const seconds =
            totalSeconds % 60;


        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(seconds).padStart(2, "0")
        );

    }


    /* =====================================================
    TIMER WARNING
    ===================================================== */

    function checkTimerWarning() {

        const timer =
            $("testTimer");


        if (!timer) {
            return;
        }


        if (
            remainingSeconds <= 60 &&
            remainingSeconds > 0
        ) {

            timer.classList.add(
                "timer-warning"
            );

        }

        else {

            timer.classList.remove(
                "timer-warning"
            );

        }

    }


    /* =====================================================
    PREVENT BACK NAVIGATION DURING TEST
    ===================================================== */

    window.addEventListener(
        "popstate",
        function () {

            if (!testStarted) {
                return;
            }


            history.pushState(
                null,
                "",
                window.location.href
            );


            alert(
                "Please finish the test before leaving this page."
            );

        }
    );


    /* =====================================================
    BEFORE UNLOAD WARNING
    ===================================================== */

    window.addEventListener(
        "beforeunload",
        function (event) {

            if (!testStarted) {
                return;
            }


            event.preventDefault();

            event.returnValue =
                "Your test is still running.";

        }
    );


    /* =====================================================
    VISIBILITY CHANGE
    ===================================================== */

    document.addEventListener(
        "visibilitychange",
        function () {

            if (
                !testStarted
            ) {

                return;

            }


            if (
                document.hidden
            ) {

                recordViolation(
                    "Tab Switch",
                    "Candidate switched away from the test page."
                );

            }

        }
    );


    /* =====================================================
    WINDOW BLUR
    ===================================================== */

    window.addEventListener(
        "blur",
        function () {

            if (
                !testStarted
            ) {

                return;

            }


            recordViolation(
                "Window Focus Lost",
                "Test window lost focus."
            );

        }
    );
    /* =====================================================
    PART 3E
    TEST SUBMISSION + SCORE CALCULATION
    ===================================================== */


    /* =====================================================
    SUBMIT TEST
    ===================================================== */

    function submitTest(autoSubmitted = false) {

        if (!isTestRunning()) {
            return;
        }


        /* ---------------------------------------------
        SAVE CURRENT ANSWER
        --------------------------------------------- */

        saveCurrentQuestionData();


        /* ---------------------------------------------
        MANUAL SUBMISSION CONFIRMATION
        --------------------------------------------- */

        if (!autoSubmitted) {

            const confirmed =
                confirm(
                    "Are you sure you want to submit this test?\n\n" +
                    "You will not be able to attempt it again."
                );


            if (!confirmed) {
                return;
            }

        }


        /* ---------------------------------------------
        STOP TEST
        --------------------------------------------- */

        testStarted = false;

        stopTimer();


        /* ---------------------------------------------
        CALCULATE RESULT
        --------------------------------------------- */

        const result =
            calculateTestResult();


        /* ---------------------------------------------
        CREATE SUBMISSION RECORD
        --------------------------------------------- */

        const submission = {

            id:
                generateId("SUB"),

            candidateId:
                currentUser.id,

            candidateName:
                currentUser.name,

            studentId:
                currentUser.studentId,

            candidateEmail:
                currentUser.email,

            testId:
                activeTest.id,

            testTitle:
                activeTest.title,

            testType:
                activeTest.type,

            score:
                result.score,

            totalMarks:
                result.totalMarks,

            percentage:
                result.percentage,

            correct:
                result.correct,

            wrong:
                result.wrong,

            unanswered:
                result.unanswered,

            answers:
                { ...userAnswers },

            questionResults:
                result.questionResults,

            violations:
                violationCount,

            submittedAutomatically:
                autoSubmitted,

            submittedAt:
                new Date().toISOString()

        };


        submissions.push(
            submission
        );


        /* ---------------------------------------------
        SAVE DATA
        --------------------------------------------- */

        saveLocalData();


        /* ---------------------------------------------
        STOP CAMERA / MIC
        --------------------------------------------- */

        stopTestEnvironment();


        /* ---------------------------------------------
        SHOW RESULT
        --------------------------------------------- */

        showResult(
            submission
        );


        /* ---------------------------------------------
        CLEAR ACTIVE TEST
        --------------------------------------------- */

        activeTest = null;

        currentQuestionIndex = 0;

        userAnswers = {};

    }


    /* =====================================================
    CALCULATE TEST RESULT
    ===================================================== */

    function calculateTestResult() {

        if (!activeTest) {

            return {

                score: 0,

                totalMarks: 0,

                percentage: 0,

                correct: 0,

                wrong: 0,

                unanswered: 0,

                questionResults: []

            };

        }


        let score = 0;

        let totalMarks = 0;

        let correct = 0;

        let wrong = 0;

        let unanswered = 0;

        const questionResults = [];


        activeTest.questions.forEach(
            (
                question,
                index
            ) => {

                const marks =
                    Number(
                        question.marks || 1
                    );


                totalMarks +=
                    marks;


                const answer =
                    userAnswers[index];


                /* ---------------------------------
                MCQ EVALUATION
                --------------------------------- */

                if (
                    question.type === "mcq"
                ) {

                    if (
                        answer === null ||
                        answer === undefined ||
                        answer === ""
                    ) {

                        unanswered++;


                        questionResults.push({

                            questionNumber:
                                index + 1,

                            question:
                                question.text,

                            type:
                                "mcq",

                            userAnswer:
                                null,

                            correctAnswer:
                                question.correctAnswer,

                            options:
                                question.options,

                            status:
                                "unanswered",

                            marks:
                                0,

                            maxMarks:
                                marks

                        });


                        return;

                    }


                    if (
                        Number(answer) ===
                        Number(
                            question.correctAnswer
                        )
                    ) {

                        score +=
                            marks;

                        correct++;


                        questionResults.push({

                            questionNumber:
                                index + 1,

                            question:
                                question.text,

                            type:
                                "mcq",

                            userAnswer:
                                Number(answer),

                            correctAnswer:
                                question.correctAnswer,

                            options:
                                question.options,

                            status:
                                "correct",

                            marks:
                                marks,

                            maxMarks:
                                marks

                        });

                    }

                    else {

                        wrong++;


                        questionResults.push({

                            questionNumber:
                                index + 1,

                            question:
                                question.text,

                            type:
                                "mcq",

                            userAnswer:
                                Number(answer),

                            correctAnswer:
                                question.correctAnswer,

                            options:
                                question.options,

                            status:
                                "wrong",

                            marks:
                                0,

                            maxMarks:
                                marks

                        });

                    }

                }


                /* ---------------------------------
                CODING EVALUATION
                --------------------------------- */

                else if (
                    question.type === "coding"
                ) {

                    const code =
                        answer;


                    if (
                        !code ||
                        String(code).trim() === ""
                    ) {

                        unanswered++;


                        questionResults.push({

                            questionNumber:
                                index + 1,

                            question:
                                question.text ||
                                question.title,

                            type:
                                "coding",

                            userAnswer:
                                "",

                            status:
                                "unanswered",

                            marks:
                                0,

                            maxMarks:
                                marks

                        });

                    }

                    else {

                        /*
                        Actual coding evaluation will
                        be connected to the backend
                        compiler later.

                        For now the submission is
                        stored as pending evaluation.
                        */

                        questionResults.push({

                            questionNumber:
                                index + 1,

                            question:
                                question.text ||
                                question.title,

                            type:
                                "coding",

                            userAnswer:
                                String(code),

                            status:
                                "pending",

                            marks:
                                0,

                            maxMarks:
                                marks

                        });

                    }

                }

            }
        );


        const percentage =
            totalMarks > 0

            ?

            Math.round(
                (score / totalMarks) *
                100
            )

            :

            0;


        return {

            score:
                score,

            totalMarks:
                totalMarks,

            percentage:
                percentage,

            correct:
                correct,

            wrong:
                wrong,

            unanswered:
                unanswered,

            questionResults:
                questionResults

        };

    }
    /* =====================================================
    PART 3F
    RESULT PAGE + ANSWER REVIEW
    ===================================================== */


    /* =====================================================
    SHOW RESULT
    ===================================================== */

    function showResult(submission) {

        if (!submission) {
            return;
        }


        /* ---------------------------------------------
        SCORE
        --------------------------------------------- */

        const score =
            $("resultScore");


        if (score) {

            score.textContent =
                `${submission.score} / ${submission.totalMarks}`;

        }


        /* ---------------------------------------------
        PERCENTAGE
        --------------------------------------------- */

        const percentage =
            $("resultPercentage");


        if (percentage) {

            percentage.textContent =
                `${submission.percentage}%`;

        }


        /* ---------------------------------------------
        CORRECT
        --------------------------------------------- */

        const correct =
            $("resultCorrect");


        if (correct) {

            correct.textContent =
                submission.correct;

        }


        /* ---------------------------------------------
        WRONG
        --------------------------------------------- */

        const wrong =
            $("resultWrong");


        if (wrong) {

            wrong.textContent =
                submission.wrong;

        }


        /* ---------------------------------------------
        UNANSWERED
        --------------------------------------------- */

        const unanswered =
            $("resultUnanswered");


        if (unanswered) {

            unanswered.textContent =
                submission.unanswered;

        }


        renderResultDetails(
            submission
        );


        renderAnswerReview(
            submission
        );


        showSection(
            "resultPage"
        );

    }


    /* =====================================================
    RESULT DETAILS
    ===================================================== */

    function renderResultDetails(
        submission
    ) {

        const container =
            $("resultDetails");


        if (!container) {
            return;
        }


        const submittedTime =
            formatDate(
                submission.submittedAt
            );


        container.innerHTML = `

            <div class="result-detail-grid">

                <div class="result-detail-item">

                    <span>Test</span>

                    <strong>
                        ${escapeHTML(
                            submission.testTitle
                        )}
                    </strong>

                </div>


                <div class="result-detail-item">

                    <span>Student ID</span>

                    <strong>
                        ${escapeHTML(
                            submission.studentId ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="result-detail-item">

                    <span>Submitted</span>

                    <strong>
                        ${submittedTime}
                    </strong>

                </div>


                <div class="result-detail-item">

                    <span>Violations</span>

                    <strong>
                        ${submission.violations || 0}
                    </strong>

                </div>


                <div class="result-detail-item">

                    <span>Submission Type</span>

                    <strong>
                        ${
                            submission.submittedAutomatically
                            ? "Automatic"
                            : "Manual"
                        }
                    </strong>

                </div>

            </div>

        `;

    }


    /* =====================================================
    ANSWER REVIEW
    ===================================================== */

    function renderAnswerReview(
        submission
    ) {

        const container =
            $("answerReview");


        if (!container) {
            return;
        }


        const results =
            Array.isArray(
                submission.questionResults
            )
                ? submission.questionResults
                : [];


        if (results.length === 0) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        📋
                    </div>

                    <h4>
                        No Answer Review Available
                    </h4>

                </div>

            `;

            return;
        }


        container.innerHTML =
            results
                .map(
                    result =>
                        renderSingleAnswerReview(
                            result
                        )
                )
                .join("");

    }


    /* =====================================================
    SINGLE ANSWER REVIEW
    ===================================================== */

    function renderSingleAnswerReview(
        result
    ) {

        let statusClass =
            "review-unanswered";


        let statusText =
            "Unanswered";


        if (
            result.status ===
            "correct"
        ) {

            statusClass =
                "review-correct";

            statusText =
                "Correct";

        }


        else if (
            result.status ===
            "wrong"
        ) {

            statusClass =
                "review-wrong";

            statusText =
                "Wrong";

        }


        else if (
            result.status ===
            "pending"
        ) {

            statusClass =
                "review-pending";

            statusText =
                "Pending Evaluation";

        }


        /* ---------------------------------------------
        CODING QUESTION
        --------------------------------------------- */

        if (
            result.type ===
            "coding"
        ) {

            return `

                <div class="
                    answer-review-item
                    ${statusClass}
                ">

                    <div class="review-header">

                        <strong>
                            Question
                            ${result.questionNumber}
                        </strong>

                        <span class="review-status">
                            ${statusText}
                        </span>

                    </div>


                    <p class="review-question">

                        ${escapeHTML(
                            result.question ||
                            "Coding Question"
                        )}

                    </p>


                    <div class="review-answer">

                        <span>
                            Your Code
                        </span>

                        <pre>
    ${escapeHTML(
        result.userAnswer ||
        "No code submitted."
    )}
                        </pre>

                    </div>


                    <div class="review-marks">

                        Marks:
                        <strong>
                            ${result.marks}
                        </strong>
                        /
                        ${result.maxMarks}

                    </div>

                </div>

            `;

        }


        /* ---------------------------------------------
        MCQ QUESTION
        --------------------------------------------- */

        const options =
            Array.isArray(
                result.options
            )
                ? result.options
                : [];


        const userAnswer =
            result.userAnswer;


        const correctAnswer =
            result.correctAnswer;


        return `

            <div class="
                answer-review-item
                ${statusClass}
            ">

                <div class="review-header">

                    <strong>
                        Question
                        ${result.questionNumber}
                    </strong>

                    <span class="review-status">
                        ${statusText}
                    </span>

                </div>


                <p class="review-question">

                    ${escapeHTML(
                        result.question ||
                        "Question"
                    )}

                </p>


                <div class="review-options">

                    ${
                        options
                            .map(
                                (
                                    option,
                                    index
                                ) => {

                                    let optionClass =
                                        "review-option";


                                    if (
                                        index ===
                                        correctAnswer
                                    ) {

                                        optionClass +=
                                            " correct-answer";

                                    }


                                    if (
                                        index ===
                                        userAnswer &&
                                        index !==
                                        correctAnswer
                                    ) {

                                        optionClass +=
                                            " user-wrong-answer";

                                    }


                                    const label =
                                        String.fromCharCode(
                                            65 + index
                                        );


                                    return `

                                        <div class="${optionClass}">

                                            <span class="review-option-label">

                                                ${label}.

                                            </span>

                                            <span>

                                                ${escapeHTML(
                                                    option
                                                )}

                                            </span>

                                            ${
                                                index ===
                                                correctAnswer

                                                ?

                                                `
                                                <strong>
                                                    ✓ Correct Answer
                                                </strong>
                                                `

                                                :

                                                index ===
                                                userAnswer

                                                ?

                                                `
                                                <strong>
                                                    ✕ Your Answer
                                                </strong>
                                                `

                                                :

                                                ""
                                            }

                                        </div>

                                    `;

                                }
                            )
                            .join("")
                    }

                </div>


                <div class="review-marks">

                    Marks:
                    <strong>
                        ${result.marks}
                    </strong>
                    /
                    ${result.maxMarks}

                </div>

            </div>

        `;

    }
    /* =====================================================
    PART 3G
    CODING TEST - RUN + SUBMIT
    ===================================================== */


    /* =====================================================
    RUN CODE
    ===================================================== */

    function runCode() {

        if (!isTestRunning()) {

            alert(
                "No test is currently running."
            );

            return;
        }


        const question =
            getCurrentQuestion();


        if (
            !question ||
            question.type !== "coding"
        ) {

            alert(
                "Run Code is available only for coding questions."
            );

            return;
        }


        const editor =
            $("codeEditor");


        const output =
            $("outputText");


        if (!editor || !output) {
            return;
        }


        const code =
            editor.value.trim();


        if (!code) {

            output.textContent =
                "Please write some code first.";

            return;
        }


        /*
        Store the code so that it is not lost
        when the candidate moves to another question.
        */

        userAnswers[
            currentQuestionIndex
        ] = code;


        /*
        IMPORTANT:
        This frontend version does NOT execute
        arbitrary candidate code inside the browser.

        Actual code execution will be connected
        to a secure backend compiler later.
        */

        output.textContent =
            "Code received successfully.\n\n" +
            "Execution service will evaluate this code " +
            "using the configured test cases.";


        addActivityLog(
            "coding_run",
            "Candidate ran code for a coding question."
        );

    }


    /* =====================================================
    SUBMIT CODE
    ===================================================== */

    function submitCode() {

        if (!isTestRunning()) {

            alert(
                "No test is currently running."
            );

            return;
        }


        const question =
            getCurrentQuestion();


        if (
            !question ||
            question.type !== "coding"
        ) {

            alert(
                "Submit Code is available only for coding questions."
            );

            return;
        }


        const editor =
            $("codeEditor");


        if (!editor) {
            return;
        }


        const code =
            editor.value.trim();


        if (!code) {

            alert(
                "Please write your code before submitting."
            );

            return;
        }


        /* ---------------------------------------------
        SAVE CODE
        --------------------------------------------- */

        userAnswers[
            currentQuestionIndex
        ] = code;


        /* ---------------------------------------------
        CURRENT FRONTEND STATUS
        --------------------------------------------- */

        const output =
            $("outputText");


        if (output) {

            output.textContent =
                "Code submitted successfully.\n\n" +
                "Status: Pending Evaluation\n" +
                "The backend compiler will run this code " +
                "against the predefined test cases.";

        }


        addActivityLog(
            "coding_submission",
            "Candidate submitted code for a coding question."
        );


        alert(
            "Code submitted successfully!\n\n" +
            "You can continue to the next question."
        );


        renderQuestionPalette();

    }


    /* =====================================================
    SAVE CODING ANSWER
    ===================================================== */

    function saveCodingAnswer() {

        if (!isTestRunning()) {
            return;
        }


        const editor =
            $("codeEditor");


        if (!editor) {
            return;
        }


        userAnswers[
            currentQuestionIndex
        ] =
            editor.value;

    }


    /* =====================================================
    CODING EDITOR INPUT LISTENER
    ===================================================== */

    document.addEventListener(
        "input",
        function (event) {

            if (
                event.target &&
                event.target.id ===
                "codeEditor"
            ) {

                if (isTestRunning()) {

                    userAnswers[
                        currentQuestionIndex
                    ] =
                        event.target.value;

                }

            }

        }
    );
    /* =====================================================
    PART 3H
    CAMERA + MICROPHONE + FULLSCREEN MONITORING
    ===================================================== */


    /* =====================================================
    START TEST ENVIRONMENT
    ===================================================== */

    async function startTestEnvironment() {

        if (!isTestRunning()) {
            return;
        }


        /* ---------------------------------------------
        RESET VIOLATION COUNT
        --------------------------------------------- */

        violationCount = 0;


        updateViolationDisplay();


        /* ---------------------------------------------
        CAMERA + MICROPHONE
        --------------------------------------------- */

        try {

            cameraStream =
                await navigator.mediaDevices.getUserMedia({

                    video: true,

                    audio: true

                });


            const video =
                $("cameraPreview");


            if (video) {

                video.srcObject =
                    cameraStream;

                video.style.display =
                    "block";

            }


            const placeholder =
                $("cameraPlaceholder");


            if (placeholder) {

                placeholder.style.display =
                    "none";

            }


            updateMonitorStatus(
                "camera",
                true,
                "Active"
            );


            updateMonitorStatus(
                "mic",
                true,
                "Active"
            );


            addActivityLog(
                "monitoring",
                "Camera and microphone monitoring started."
            );

        }

        catch (error) {

            console.error(
                "Camera/Microphone error:",
                error
            );


            updateMonitorStatus(
                "camera",
                false,
                "Blocked"
            );


            updateMonitorStatus(
                "mic",
                false,
                "Blocked"
            );


            recordViolation(
                "Camera/Microphone",
                "Camera or microphone permission was denied or interrupted."
            );


            alert(
                "Camera and microphone access is required for this assessment.\n\n" +
                "Please allow camera and microphone permissions and continue."
            );

        }


        /* ---------------------------------------------
        FULLSCREEN
        --------------------------------------------- */

        try {

            await requestTestFullscreen();

        }

        catch (error) {

            console.warn(
                "Fullscreen request failed:",
                error
            );

            updateMonitorStatus(
                "fullscreen",
                false,
                "Not Active"
            );

        }

    }


    /* =====================================================
    STOP TEST ENVIRONMENT
    ===================================================== */

    function stopTestEnvironment() {

        /* ---------------------------------------------
        STOP TIMER
        --------------------------------------------- */

        stopTimer();


        /* ---------------------------------------------
        STOP CAMERA + MICROPHONE
        --------------------------------------------- */

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => {
                        track.stop();
                    }
                );

            cameraStream =
                null;

        }


        const video =
            $("cameraPreview");


        if (video) {

            video.srcObject =
                null;

            video.style.display =
                "none";

        }


        const placeholder =
            $("cameraPlaceholder");


        if (placeholder) {

            placeholder.style.display =
                "flex";

        }


        /* ---------------------------------------------
        UPDATE STATUS
        --------------------------------------------- */

        updateMonitorStatus(
            "camera",
            false,
            "Off"
        );


        updateMonitorStatus(
            "mic",
            false,
            "Off"
        );


        /* ---------------------------------------------
        EXIT FULLSCREEN
        --------------------------------------------- */

        if (
            document.fullscreenElement
        ) {

            document
                .exitFullscreen()
                .catch(
                    () => {}
                );

        }


        testStarted =
            false;

    }


    /* =====================================================
    REQUEST FULLSCREEN
    ===================================================== */

    async function requestTestFullscreen() {

        const page =
            $("testPage");


        if (!page) {
            return;
        }


        try {

            if (
                !document.fullscreenElement
            ) {

                await page.requestFullscreen();

            }


            updateMonitorStatus(
                "fullscreen",
                true,
                "Active"
            );

        }

        catch (error) {

            updateMonitorStatus(
                "fullscreen",
                false,
                "Not Active"
            );

            throw error;

        }

    }


    /* =====================================================
    FULLSCREEN CHANGE
    ===================================================== */

    document.addEventListener(
        "fullscreenchange",
        function () {

            if (!testStarted) {
                return;
            }


            if (
                document.fullscreenElement
            ) {

                updateMonitorStatus(
                    "fullscreen",
                    true,
                    "Active"
                );

            }

            else {

                updateMonitorStatus(
                    "fullscreen",
                    false,
                    "Exited"
                );


                recordViolation(
                    "Fullscreen Exit",
                    "Candidate exited fullscreen mode during the test."
                );

            }

        }
    );


    /* =====================================================
    CAMERA / MICROPHONE TRACK MONITORING
    ===================================================== */

    function monitorMediaTracks() {

        if (!cameraStream) {
            return;
        }


        const videoTrack =
            cameraStream.getVideoTracks()[0];


        const audioTrack =
            cameraStream.getAudioTracks()[0];


        if (videoTrack) {

            videoTrack.onended =
                function () {

                    if (!testStarted) {
                        return;
                    }


                    updateMonitorStatus(
                        "camera",
                        false,
                        "Interrupted"
                    );


                    recordViolation(
                        "Camera Interrupted",
                        "Camera stream was interrupted during the test."
                    );

                };

        }


        if (audioTrack) {

            audioTrack.onended =
                function () {

                    if (!testStarted) {
                        return;
                    }


                    updateMonitorStatus(
                        "mic",
                        false,
                        "Interrupted"
                    );


                    recordViolation(
                        "Microphone Interrupted",
                        "Microphone stream was interrupted during the test."
                    );

                };

        }

    }


    /* =====================================================
    UPDATE MONITOR STATUS
    ===================================================== */

    function updateMonitorStatus(
        type,
        active,
        text
    ) {

        let statusElement;
        let dotElement;


        if (type === "camera") {

            statusElement =
                $("cameraStatus");

            dotElement =
                $("cameraStatusDot");

        }


        else if (type === "mic") {

            statusElement =
                $("micStatus");

            dotElement =
                $("micStatusDot");

        }


        else if (type === "fullscreen") {

            statusElement =
                $("fullscreenStatus");

            dotElement =
                $("fullscreenStatusDot");

        }


        if (statusElement) {

            statusElement.textContent =
                text;

        }


        if (dotElement) {

            dotElement.classList.toggle(
                "active",
                active
            );

            dotElement.classList.toggle(
                "inactive",
                !active
            );

        }

    }


    /* =====================================================
    UPDATE VIOLATION DISPLAY
    ===================================================== */

    function updateViolationDisplay() {

        const counter =
            $("violationCount");


        if (counter) {

            counter.textContent =
                violationCount;

        }

    }


    /* =====================================================
    RECORD VIOLATION
    ===================================================== */

    function recordViolation(
        type,
        message
    ) {

        violationCount++;


        updateViolationDisplay();


        addActivityLog(
            "violation",
            `${type}: ${message}`
        );


        /*
        Repeated violations can trigger
        automatic submission.
        */

        const maximumViolations =
            3;


        if (
            violationCount >=
            maximumViolations &&
            testStarted
        ) {

            alert(
                "Multiple suspicious activities were detected.\n\n" +
                "The assessment will now be submitted."
            );


            submitTest(
                true
            );

        }

    }


    /* =====================================================
    ADD ACTIVITY LOG
    ===================================================== */

    function addActivityLog(
        type,
        message
    ) {

        const log = {

            id:
                generateId("LOG"),

            type:
                type,

            message:
                message,

            candidateId:
                currentUser?.id ||
                null,

            candidateName:
                currentUser?.name ||
                "Unknown",

            testId:
                activeTest?.id ||
                null,

            timestamp:
                new Date().toISOString()

        };


        activityLogs.push(
            log
        );


        saveLocalData();

    }
    /* =====================================================
    PART 3I
    MEDIA MONITORING + TEST EVENT HANDLERS
    ===================================================== */


    /* =====================================================
    ACTIVATE MEDIA TRACK MONITORING
    ===================================================== */

    function activateMediaMonitoring() {

        if (!cameraStream) {
            return;
        }


        monitorMediaTracks();

    }


    /* =====================================================
    CAMERA / MIC DEVICE CHANGE
    ===================================================== */

    if (
        navigator.mediaDevices &&
        navigator.mediaDevices.addEventListener
    ) {

        navigator.mediaDevices.addEventListener(
            "devicechange",
            function () {

                if (!testStarted) {
                    return;
                }


                /*
                Check whether the media stream
                is still available.
                */

                if (!cameraStream) {

                    recordViolation(
                        "Media Device",
                        "Camera or microphone device became unavailable."
                    );

                    return;

                }


                const videoTracks =
                    cameraStream.getVideoTracks();


                const audioTracks =
                    cameraStream.getAudioTracks();


                if (
                    videoTracks.length === 0
                ) {

                    updateMonitorStatus(
                        "camera",
                        false,
                        "Unavailable"
                    );


                    recordViolation(
                        "Camera Unavailable",
                        "No active camera track was detected."
                    );

                }


                if (
                    audioTracks.length === 0
                ) {

                    updateMonitorStatus(
                        "mic",
                        false,
                        "Unavailable"
                    );


                    recordViolation(
                        "Microphone Unavailable",
                        "No active microphone track was detected."
                    );

                }

            }
        );

    }


    /* =====================================================
    PERIODIC MEDIA CHECK
    ===================================================== */

    let mediaCheckInterval = null;


    function startMediaCheck() {

        stopMediaCheck();


        mediaCheckInterval =
            setInterval(
                function () {

                    if (!testStarted) {

                        stopMediaCheck();

                        return;

                    }


                    if (!cameraStream) {
                        return;
                    }


                    const videoTracks =
                        cameraStream.getVideoTracks();


                    const audioTracks =
                        cameraStream.getAudioTracks();


                    const cameraActive =
                        videoTracks.length > 0 &&
                        videoTracks.some(
                            track =>
                                track.readyState ===
                                "live" &&
                                track.enabled
                        );


                    const micActive =
                        audioTracks.length > 0 &&
                        audioTracks.some(
                            track =>
                                track.readyState ===
                                "live" &&
                                track.enabled
                        );


                    if (!cameraActive) {

                        updateMonitorStatus(
                            "camera",
                            false,
                            "Interrupted"
                        );

                    }


                    else {

                        updateMonitorStatus(
                            "camera",
                            true,
                            "Active"
                        );

                    }


                    if (!micActive) {

                        updateMonitorStatus(
                            "mic",
                            false,
                            "Interrupted"
                        );

                    }


                    else {

                        updateMonitorStatus(
                            "mic",
                            true,
                            "Active"
                        );

                    }

                },
                3000
            );

    }


    /* =====================================================
    STOP MEDIA CHECK
    ===================================================== */

    function stopMediaCheck() {

        if (mediaCheckInterval) {

            clearInterval(
                mediaCheckInterval
            );

            mediaCheckInterval =
                null;

        }

    }


    /* =====================================================
    PATCH TEST ENVIRONMENT START
    ===================================================== */

    const originalStartTestEnvironment =
        startTestEnvironment;


    startTestEnvironment =
        async function () {

            await originalStartTestEnvironment();


            if (!testStarted) {
                return;
            }


            activateMediaMonitoring();

            startMediaCheck();

        };


    /* =====================================================
    PATCH TEST ENVIRONMENT STOP
    ===================================================== */

    const originalStopTestEnvironment =
        stopTestEnvironment;


    stopTestEnvironment =
        function () {

            stopMediaCheck();

            originalStopTestEnvironment();

        };


    /* =====================================================
    TEST PAGE KEYBOARD PROTECTION
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (!testStarted) {
                return;
            }


            /*
            Block common browser shortcuts that
            could interfere with the assessment.
            */

            const blockedShortcut =
                (
                    event.ctrlKey &&
                    (
                        event.key === "u" ||
                        event.key === "s" ||
                        event.key === "p"
                    )
                )
                ||
                (
                    event.ctrlKey &&
                    event.shiftKey &&
                    (
                        event.key === "I" ||
                        event.key === "J" ||
                        event.key === "C"
                    )
                );


            if (blockedShortcut) {

                event.preventDefault();


                recordViolation(
                    "Restricted Shortcut",
                    "A restricted browser keyboard shortcut was pressed."
                );

            }

        }
    );


    /* =====================================================
    DISABLE RIGHT CLICK DURING TEST
    ===================================================== */

    document.addEventListener(
        "contextmenu",
        function (event) {

            if (!testStarted) {
                return;
            }


            event.preventDefault();


            recordViolation(
                "Right Click",
                "Right-click was attempted during the assessment."
            );

        }
    );
    /* =====================================================
    PART 3J
    FINAL UTILITY + DASHBOARD REFRESH
    ===================================================== */


    /* =====================================================
    REFRESH CURRENT DASHBOARD
    ===================================================== */

    function refreshCurrentDashboard() {

        if (!currentUser) {
            return;
        }


        if (
            currentUser.role ===
            "admin"
        ) {

            loadAdminDashboard();

            loadAdminResults();

        }


        else if (
            currentUser.role ===
            "candidate"
        ) {

            loadCandidateDashboard();

        }

    }


    /* =====================================================
    REFRESH ALL DATA
    ===================================================== */

    function refreshApplicationData() {

        loadLocalData();

        refreshCurrentDashboard();

    }


    /* =====================================================
    GET TEST BY ID
    ===================================================== */

    function getTestById(testId) {

        return tests.find(
            test =>
                test.id === testId
        ) || null;

    }


    /* =====================================================
    GET CANDIDATE BY ID
    ===================================================== */

    function getCandidateById(
        candidateId
    ) {

        return candidates.find(
            candidate =>
                candidate.id === candidateId
        ) || null;

    }


    /* =====================================================
    GET SUBMISSIONS FOR TEST
    ===================================================== */

    function getTestSubmissions(
        testId
    ) {

        return submissions.filter(
            submission =>
                submission.testId ===
                testId
        );

    }


    /* =====================================================
    GET CANDIDATE SUBMISSIONS
    ===================================================== */

    function getCandidateSubmissions(
        candidateId
    ) {

        return submissions.filter(
            submission =>
                submission.candidateId ===
                candidateId
        );

    }


    /* =====================================================
    GET TEST VIOLATIONS
    ===================================================== */

    function getTestViolations(
        testId
    ) {

        return activityLogs.filter(
            log =>
                log.testId ===
                testId &&
                log.type ===
                "violation"
        );

    }


    /* =====================================================
    SAFE NUMBER
    ===================================================== */

    function safeNumber(
        value,
        fallback = 0
    ) {

        const number =
            Number(value);


        return Number.isFinite(number)
            ? number
            : fallback;

    }


    /* =====================================================
    SAFE TEXT
    ===================================================== */

    function safeText(
        value,
        fallback = ""
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return fallback;

        }


        return String(value);

    }


    /* =====================================================
    CHECK LOGIN
    ===================================================== */

    function isLoggedIn() {

        return (
            currentUser !== null
        );

    }


    /* =====================================================
    CHECK ADMIN
    ===================================================== */

    function isAdmin() {

        return (
            currentUser &&
            currentUser.role ===
            "admin"
        );

    }


    /* =====================================================
    CHECK CANDIDATE
    ===================================================== */

    function isCandidate() {

        return (
            currentUser &&
            currentUser.role ===
            "candidate"
        );

    }


    /* =====================================================
    APPLICATION START CHECK
    ===================================================== */

    console.log(
        "ExamShuffle application loaded successfully."
    );
    window.showSection = showSection;
window.selectLoginRole = selectLoginRole;
window.showSignup = showSignup;
window.goHome = goHome;
window.logout = logout;