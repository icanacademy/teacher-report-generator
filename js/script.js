document.addEventListener('DOMContentLoaded', function() {
    const reportForm = document.getElementById('reportForm');
    const clearFormBtn = document.getElementById('clearForm');
    const reportOutput = document.getElementById('reportOutput');
    const dateInput = document.getElementById('date');
    const dayOfWeekInput = document.getElementById('dayOfWeek');
    const studentSearchInput = document.getElementById('studentSearch');
    const studentDropdown = document.getElementById('studentDropdown');
    const studentNameHidden = document.getElementById('studentName');
    const studentIdInput = document.getElementById('studentId');
    const dropdownArrow = document.getElementById('dropdownArrow');
    
    const teacherSearchInput = document.getElementById('teacherSearch');
    const teacherDropdown = document.getElementById('teacherDropdown');
    const teacherNameHidden = document.getElementById('teacherName');
    const teacherIdInput = document.getElementById('teacherId');
    const teacherDropdownArrow = document.getElementById('teacherDropdownArrow');

    const skillFocusSearchInput = document.getElementById('skillFocusSearch');
    const skillFocusDropdown = document.getElementById('skillFocusDropdown');
    const skillFocusHidden = document.getElementById('skillFocus');
    const skillFocusDropdownArrow = document.getElementById('skillFocusDropdownArrow');

    const subjectSelect = document.getElementById('subject');
    const skillsSection = document.getElementById('skillsSection');
    const skillsContainer = document.getElementById('skillsContainer');
    let skillsData = {};

    let studentsData = [];
    let filteredStudents = [];
    let selectedIndex = -1;
    let isDropdownOpen = false;

    let teachersData = [];
    let filteredTeachers = [];
    let selectedTeacherIndex = -1;
    let isTeacherDropdownOpen = false;

    let focusSkillsData = [];
    let filteredFocusSkills = [];
    let selectedFocusSkillIndex = -1;
    let isFocusSkillDropdownOpen = false;

    // ── Online/In-Person Mode Switching ──
    let currentMode = 'in-person'; // 'in-person' | 'online'
    const draftCache = { 'in-person': null, 'online': null };

    // Helper function to extract first name from brackets
    function extractFirstName(fullName) {
        const match = fullName.match(/^\[([^\]]+)\]/);
        return match ? match[1] : fullName;
    }

    // Function to highlight strongest and weakest sentences
    function highlightSentiment(text) {
        // Positive indicator words with weights
        const positiveWords = {
            'excellent': 5, 'outstanding': 5, 'exceptional': 5, 'impressive': 4,
            'strong': 3, 'strengths': 3, 'proficient': 4, 'skilled': 3,
            'talented': 4, 'creative': 3, 'enthusiastic': 3, 'engaged': 3,
            'confident': 3, 'improved': 3, 'progress': 3,
            'successful': 4, 'achievement': 3, 'achieves': 3, 'mastered': 5,
            'mastery': 4, 'excels': 5, 'excelled': 5, 'demonstrates': 2,
            'great': 3, 'well': 2, 'better': 2, 'best': 4,
            'consistently': 2, 'active': 2, 'participates': 2, 'attentive': 3,
            'focused': 3, 'understands': 2, 'understanding': 2, 'comprehends': 3,
            'grasps': 3, 'bright': 3, 'advanced': 4, 'superior': 5,
            'remarkable': 4, 'wonderful': 4, 'fantastic': 4, 'amazing': 4,
            'commendable': 4, 'praise': 3, 'positive': 2, 'cooperative': 2,
            'completing': 2, 'completed': 2, 'successfully': 3
        };

        // Negative indicator words with weights
        const negativeWords = {
            'struggle': -4, 'struggles': -4, 'struggling': -4, 'difficulty': -3,
            'difficulties': -3, 'challenging': -2, 'challenges': -3, 'weak': -4,
            'weakness': -4, 'weaknesses': -4, 'poor': -4, 'low': -3, 'below': -3,
            'lacking': -3, 'needs': -2, 'requires': -2, 'improvement': -1,
            'concerns': -3, 'concerning': -3, 'issue': -3, 'issues': -3,
            'problem': -4, 'problems': -4, 'unable': -4, 'cannot': -4,
            'failed': -5, 'failure': -5, 'incomplete': -3, 'missing': -3,
            'absent': -3, 'distracted': -3, 'unfocused': -3, 'confused': -4,
            'confusion': -4, 'misunderstands': -4, 'misunderstanding': -4,
            'inadequate': -4, 'insufficient': -3, 'limited': -3, 'slow': -3,
            'behind': -3, 'frustration': -3, 'frustrated': -3, 'hesitant': -3,
            'reluctant': -3, 'avoid': -3, 'avoids': -3, 'resistant': -3, 'minimal': -3,
            'lower': -2, 'affecting': -2
        };

        // Negative context phrases that override positive words
        const negativeContexts = [
            'however', 'but', 'although', 'though', 'yet', 'unfortunately',
            'not met', 'did not', 'was not', 'were not', 'has not', 'have not',
            'may not', 'might not', 'could not', 'would not', 'should not',
            'suggest that', 'indicating', 'need for'
        ];

        // Split text into sentences
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

        // Calculate sentiment score for each sentence
        const sentenceScores = sentences.map(sentence => {
            let score = 0;
            const lowerSentence = sentence.toLowerCase();

            // Check for negative context markers
            const hasNegativeContext = negativeContexts.some(context =>
                lowerSentence.includes(context.toLowerCase())
            );

            // Check positive words
            Object.entries(positiveWords).forEach(([word, weight]) => {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                const matches = lowerSentence.match(regex);
                if (matches) {
                    // If sentence has negative context, reduce positive word impact
                    const modifier = hasNegativeContext ? 0.3 : 1;
                    score += weight * matches.length * modifier;
                }
            });

            // Check negative words
            Object.entries(negativeWords).forEach(([word, weight]) => {
                const regex = new RegExp(`\\b${word}\\b`, 'gi');
                const matches = lowerSentence.match(regex);
                if (matches) score += weight * matches.length;
            });

            // Apply negative context penalty if present
            if (hasNegativeContext) {
                score -= 2; // Additional penalty for negative context
            }

            return { sentence: sentence.trim(), score };
        });

        // Find strongest (most positive) and weakest (most negative) sentences
        let strongestSentence = sentenceScores[0];
        let weakestSentence = sentenceScores[0];

        sentenceScores.forEach(item => {
            if (item.score > strongestSentence.score) strongestSentence = item;
            if (item.score < weakestSentence.score) weakestSentence = item;
        });

        // Only highlight if there's a significant difference
        let highlightedText = text;

        if (strongestSentence.score > 3) {
            const escapedSentence = strongestSentence.sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            highlightedText = highlightedText.replace(
                new RegExp(escapedSentence, 'g'),
                `<span style="background-color: #d1fae5; color: #065f46; padding: 2px 4px; border-radius: 3px; font-weight: 500;">${strongestSentence.sentence}</span>`
            );
        }

        if (weakestSentence.score < -3 && strongestSentence.sentence !== weakestSentence.sentence) {
            const escapedSentence = weakestSentence.sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            highlightedText = highlightedText.replace(
                new RegExp(escapedSentence, 'g'),
                `<span style="color: #dc2626; font-weight: 600;">${weakestSentence.sentence}</span>`
            );
        }

        return highlightedText;
    }

    // New AI-powered function to highlight phrases using font color
    function highlightSentimentAI(text, sentimentData) {
        if (!sentimentData) return text;

        let highlightedText = text;

        // Highlight positive phrase in green (font color only)
        if (sentimentData.positive) {
            const escapedPhrase = sentimentData.positive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            try {
                highlightedText = highlightedText.replace(
                    new RegExp(escapedPhrase, 'gi'),
                    `<span style="color: #16a34a; font-weight: 600;">${sentimentData.positive}</span>`
                );
            } catch (e) {
                console.error('Error highlighting positive phrase:', e);
            }
        }

        // Highlight negative phrase in red (font color only)
        if (sentimentData.negative) {
            const escapedPhrase = sentimentData.negative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            try {
                highlightedText = highlightedText.replace(
                    new RegExp(escapedPhrase, 'gi'),
                    `<span style="color: #dc2626; font-weight: 600;">${sentimentData.negative}</span>`
                );
            } catch (e) {
                console.error('Error highlighting negative phrase:', e);
            }
        }

        return highlightedText;
    }

    // Set today's date as default
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
    updateDayOfWeek();
    
    // Load data from Notion
    loadStudents();
    loadTeachers();
    loadSkills();
    loadFocusSkills();
    
    // Initialize star ratings
    initializeStarRatings();

    // Initialize toggle switch
    initializeToggleSwitch();

    // Tab switching
    document.querySelectorAll('.tab-btn[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    // Update day of week when date changes
    dateInput.addEventListener('change', updateDayOfWeek);
    
    // Add search functionality for students
    studentSearchInput.addEventListener('input', handleSearch);
    studentSearchInput.addEventListener('keydown', handleKeydown);
    studentSearchInput.addEventListener('focus', showDropdown);
    
    // Add dropdown arrow functionality for students
    dropdownArrow.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
    });
    
    // Add search functionality for teachers
    teacherSearchInput.addEventListener('input', handleTeacherSearch);
    teacherSearchInput.addEventListener('keydown', handleTeacherKeydown);
    teacherSearchInput.addEventListener('focus', showTeacherDropdown);
    
    // Add dropdown arrow functionality for teachers
    teacherDropdownArrow.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTeacherDropdown();
    });

    // Add search functionality for focus skills
    skillFocusSearchInput.addEventListener('input', handleFocusSkillSearch);
    skillFocusSearchInput.addEventListener('keydown', handleFocusSkillKeydown);
    skillFocusSearchInput.addEventListener('focus', showFocusSkillDropdown);

    // Add dropdown arrow functionality for focus skills
    skillFocusDropdownArrow.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleFocusSkillDropdown();
    });

    // Handle subject change
    subjectSelect.addEventListener('change', () => {
        const selectedSubject = subjectSelect.value;
        if (selectedSubject && skillsData[selectedSubject]) {
            skillsSection.style.display = 'block';
            renderSkills(skillsData[selectedSubject]);
        } else {
            skillsSection.style.display = 'none';
        }
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!studentSearchInput.contains(e.target) && !studentDropdown.contains(e.target) && !dropdownArrow.contains(e.target)) {
            hideDropdown();
        }
        if (!teacherSearchInput.contains(e.target) && !teacherDropdown.contains(e.target) && !teacherDropdownArrow.contains(e.target)) {
            hideTeacherDropdown();
        }
        if (!skillFocusSearchInput.contains(e.target) && !skillFocusDropdown.contains(e.target) && !skillFocusDropdownArrow.contains(e.target)) {
            hideFocusSkillDropdown();
        }
    });
    
    async function loadStudents() {
        try {
            const response = await fetch('/api/students');
            if (response.ok) {
                studentsData = await response.json();
                populateStudentDropdown();
            } else {
                console.error('Failed to load students');
                studentSearchInput.placeholder = 'Failed to load students';
            }
        } catch (error) {
            console.error('Error loading students:', error);
            studentSearchInput.placeholder = 'Error loading students';
        }
    }
    
    function populateStudentDropdown() {
        studentSearchInput.placeholder = `Type to search ${studentsData.length} students...`;
        filteredStudents = studentsData;
    }
    
    async function loadTeachers() {
        try {
            const response = await fetch('/api/teachers');
            if (response.ok) {
                teachersData = await response.json();
                populateTeacherDropdown();
            } else {
                console.error('Failed to load teachers');
                teacherSearchInput.placeholder = 'Failed to load teachers';
            }
        } catch (error) {
            console.error('Error loading teachers:', error);
            teacherSearchInput.placeholder = 'Error loading teachers';
        }
    }

    async function loadSkills() {
        try {
            const response = await fetch('/api/skills');
            if (response.ok) {
                skillsData = await response.json();
                const subjects = Object.keys(skillsData);
                subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                });
            } else {
                console.error('Failed to load skills');
            }
        } catch (error) {
            console.error('Error loading skills:', error);
        }
    }
    
    function populateTeacherDropdown() {
        teacherSearchInput.placeholder = `Type to search ${teachersData.length} teachers...`;
        filteredTeachers = teachersData;
    }
    
    function handleSearch() {
        const searchTerm = studentSearchInput.value.toLowerCase();
        filteredStudents = studentsData.filter(student => 
            student.fullName.toLowerCase().includes(searchTerm)
        );
        selectedIndex = -1;
        renderDropdown();
        showDropdown();
    }
    
    function handleKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, filteredStudents.length - 1);
            renderDropdown();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            renderDropdown();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && filteredStudents[selectedIndex]) {
                selectStudent(filteredStudents[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    }
    
    function renderDropdown() {
        studentDropdown.innerHTML = '';
        
        if (filteredStudents.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-item no-results';
            noResults.textContent = 'No students found';
            studentDropdown.appendChild(noResults);
        } else {
            filteredStudents.forEach((student, index) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                if (index === selectedIndex) {
                    item.classList.add('selected');
                }
                item.textContent = student.fullName;
                item.addEventListener('click', () => selectStudent(student));
                studentDropdown.appendChild(item);
            });
        }
    }
    
    function selectStudent(student) {
        studentSearchInput.value = student.fullName;
        studentNameHidden.value = student.fullName;
        studentIdInput.value = student.studentId;

        // Populate new fields with TBD if blank
        document.getElementById('gradeLevel').value = student.gradeLevel !== null ? student.gradeLevel : 'TBD';
        document.getElementById('wpmInitial').value = student.wpmInitial !== null ? student.wpmInitial : 'TBD';
        document.getElementById('gbwtInitial').value = student.gbwtInitial || 'TBD';
        document.getElementById('readingLevelInitial').value = student.readingLevelInitial || 'TBD';
        document.getElementById('interviewScore').value = student.interviewScore !== null ? student.interviewScore : 'TBD';
        document.getElementById('studentGender').value = student.gender || '';

        hideDropdown();
    }
    
    function showDropdown() {
        if (filteredStudents.length > 0 || studentSearchInput.value.length > 0) {
            renderDropdown();
            studentDropdown.classList.add('show');
        }
    }
    
    function hideDropdown() {
        studentDropdown.classList.remove('show');
        isDropdownOpen = false;
        dropdownArrow.classList.remove('open');
    }
    
    function toggleDropdown() {
        if (isDropdownOpen) {
            hideDropdown();
        } else {
            filteredStudents = studentsData; // Show all students
            renderDropdown();
            showDropdown();
            studentSearchInput.focus();
            isDropdownOpen = true;
            dropdownArrow.classList.add('open');
        }
    }
    
    // Teacher dropdown functions
    function handleTeacherSearch() {
        const searchTerm = teacherSearchInput.value.toLowerCase();
        filteredTeachers = teachersData.filter(teacher => 
            teacher.fullName.toLowerCase().includes(searchTerm)
        );
        selectedTeacherIndex = -1;
        renderTeacherDropdown();
        showTeacherDropdown();
    }
    
    function handleTeacherKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedTeacherIndex = Math.min(selectedTeacherIndex + 1, filteredTeachers.length - 1);
            renderTeacherDropdown();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedTeacherIndex = Math.max(selectedTeacherIndex - 1, -1);
            renderTeacherDropdown();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedTeacherIndex >= 0 && filteredTeachers[selectedTeacherIndex]) {
                selectTeacher(filteredTeachers[selectedTeacherIndex]);
            }
        } else if (e.key === 'Escape') {
            hideTeacherDropdown();
        }
    }
    
    function renderTeacherDropdown() {
        teacherDropdown.innerHTML = '';
        
        if (filteredTeachers.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-item no-results';
            noResults.textContent = 'No teachers found';
            teacherDropdown.appendChild(noResults);
        } else {
            filteredTeachers.forEach((teacher, index) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                if (index === selectedTeacherIndex) {
                    item.classList.add('selected');
                }
                item.textContent = teacher.fullName;
                item.addEventListener('click', () => selectTeacher(teacher));
                teacherDropdown.appendChild(item);
            });
        }
    }
    
    function selectTeacher(teacher) {
        teacherSearchInput.value = teacher.fullName;
        teacherNameHidden.value = teacher.fullName;
        teacherIdInput.value = teacher.teacherId;
        hideTeacherDropdown();
    }
    
    function showTeacherDropdown() {
        if (filteredTeachers.length > 0 || teacherSearchInput.value.length > 0) {
            renderTeacherDropdown();
            teacherDropdown.classList.add('show');
        }
    }
    
    function hideTeacherDropdown() {
        teacherDropdown.classList.remove('show');
        isTeacherDropdownOpen = false;
        teacherDropdownArrow.classList.remove('open');
    }
    
    function toggleTeacherDropdown() {
        if (isTeacherDropdownOpen) {
            hideTeacherDropdown();
        } else {
            filteredTeachers = teachersData; // Show all teachers
            renderTeacherDropdown();
            showTeacherDropdown();
            teacherSearchInput.focus();
            isTeacherDropdownOpen = true;
            teacherDropdownArrow.classList.add('open');
        }
    }

    // Focus Skill dropdown functions
    async function loadFocusSkills() {
        try {
            const response = await fetch('/api/focusskills');
            if (response.ok) {
                focusSkillsData = await response.json();
                populateFocusSkillDropdown();
            } else {
                console.error('Failed to load focus skills');
                skillFocusSearchInput.placeholder = 'Failed to load focus skills';
            }
        } catch (error) {
            console.error('Error loading focus skills:', error);
            skillFocusSearchInput.placeholder = 'Error loading focus skills';
        }
    }

    function populateFocusSkillDropdown() {
        skillFocusSearchInput.placeholder = `Type to search ${focusSkillsData.length} focus skills or enter custom...`;
        filteredFocusSkills = focusSkillsData;
    }

    function handleFocusSkillSearch() {
        const searchTerm = skillFocusSearchInput.value.toLowerCase();

        // Update hidden field with whatever is typed (for manual entry)
        skillFocusHidden.value = skillFocusSearchInput.value;

        filteredFocusSkills = focusSkillsData.filter(skill =>
            skill.toLowerCase().includes(searchTerm)
        );
        selectedFocusSkillIndex = -1;
        renderFocusSkillDropdown();
        showFocusSkillDropdown();
    }

    function handleFocusSkillKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedFocusSkillIndex = Math.min(selectedFocusSkillIndex + 1, filteredFocusSkills.length - 1);
            renderFocusSkillDropdown();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedFocusSkillIndex = Math.max(selectedFocusSkillIndex - 1, -1);
            renderFocusSkillDropdown();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedFocusSkillIndex >= 0 && filteredFocusSkills[selectedFocusSkillIndex]) {
                selectFocusSkill(filteredFocusSkills[selectedFocusSkillIndex]);
            }
        } else if (e.key === 'Escape') {
            hideFocusSkillDropdown();
        }
    }

    function renderFocusSkillDropdown() {
        skillFocusDropdown.innerHTML = '';

        if (filteredFocusSkills.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-item no-results';
            noResults.textContent = 'No focus skills found';
            skillFocusDropdown.appendChild(noResults);
        } else {
            filteredFocusSkills.forEach((skill, index) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                if (index === selectedFocusSkillIndex) {
                    item.classList.add('selected');
                }
                item.textContent = skill;
                item.addEventListener('click', () => selectFocusSkill(skill));
                skillFocusDropdown.appendChild(item);
            });
        }
    }

    function selectFocusSkill(skill) {
        skillFocusSearchInput.value = skill;
        skillFocusHidden.value = skill;
        hideFocusSkillDropdown();
    }

    function showFocusSkillDropdown() {
        if (filteredFocusSkills.length > 0 || skillFocusSearchInput.value.length > 0) {
            renderFocusSkillDropdown();
            skillFocusDropdown.classList.add('show');
        }
    }

    function hideFocusSkillDropdown() {
        skillFocusDropdown.classList.remove('show');
        isFocusSkillDropdownOpen = false;
        skillFocusDropdownArrow.classList.remove('open');
    }

    function toggleFocusSkillDropdown() {
        if (isFocusSkillDropdownOpen) {
            hideFocusSkillDropdown();
        } else {
            filteredFocusSkills = focusSkillsData; // Show all focus skills
            renderFocusSkillDropdown();
            showFocusSkillDropdown();
            skillFocusSearchInput.focus();
            isFocusSkillDropdownOpen = true;
            skillFocusDropdownArrow.classList.add('open');
        }
    }
    
    // ── Mode Switching ──
    function captureFormState() {
        return {
            studentSearch: studentSearchInput.value,
            studentName: studentNameHidden.value,
            studentId: studentIdInput.value,
            date: dateInput.value,
            teacherSearch: teacherSearchInput.value,
            teacherName: teacherNameHidden.value,
            teacherId: teacherIdInput.value,
            subject: subjectSelect.value,
            materials: document.getElementById('materials').value,
            skillFocusSearch: skillFocusSearchInput.value,
            skillFocus: skillFocusHidden.value,
            skillFocusMet: document.getElementById('skillFocusMet').checked,
            currentLesson: document.getElementById('currentLesson').value,
            homework: document.getElementById('homework').value,
            activitiesFinished: document.getElementById('activitiesFinished').value,
            activitiesNotFinished: document.getElementById('activitiesNotFinished').value,
            studentGender: document.getElementById('studentGender').value,
            attention: document.getElementById('attention').value,
            retention: document.getElementById('retention').value,
            comprehension: document.getElementById('comprehension').value,
            behavior: document.getElementById('behavior').value,
            handwriting: document.getElementById('handwriting').value,
            conversation: document.getElementById('conversation').value,
            wpmInitial: document.getElementById('wpmInitial').value,
            gbwtInitial: document.getElementById('gbwtInitial').value,
            readingLevelInitial: document.getElementById('readingLevelInitial').value,
            interviewScore: document.getElementById('interviewScore').value,
            scoreBookMaterials: document.getElementById('scoreBookMaterials').value,
            totalBookMaterials: document.getElementById('totalBookMaterials').value,
            scoreVocabulary: document.getElementById('scoreVocabulary').value,
            totalVocabulary: document.getElementById('totalVocabulary').value,
            scoreClassVideo: document.getElementById('scoreClassVideo').value,
            totalClassVideo: document.getElementById('totalClassVideo').value,
            scoreHomework: document.getElementById('scoreHomework').value,
            totalHomework: document.getElementById('totalHomework').value,
            scoreHomeworkVocab: document.getElementById('scoreHomeworkVocab').value,
            totalHomeworkVocab: document.getElementById('totalHomeworkVocab').value,
            scoreWeeklyTest: document.getElementById('scoreWeeklyTest').value,
            totalWeeklyTest: document.getElementById('totalWeeklyTest').value,
        };
    }

    function restoreFormState(state) {
        if (!state) return;
        studentSearchInput.value = state.studentSearch || '';
        studentNameHidden.value = state.studentName || '';
        studentIdInput.value = state.studentId || '';
        dateInput.value = state.date || today.toISOString().split('T')[0];
        updateDayOfWeek();
        teacherSearchInput.value = state.teacherSearch || '';
        teacherNameHidden.value = state.teacherName || '';
        teacherIdInput.value = state.teacherId || '';
        subjectSelect.value = state.subject || '';
        document.getElementById('materials').value = state.materials || '';
        skillFocusSearchInput.value = state.skillFocusSearch || '';
        skillFocusHidden.value = state.skillFocus || '';
        const toggleCheckbox = document.getElementById('skillFocusMet');
        const toggleLabel = document.getElementById('toggleLabel');
        toggleCheckbox.checked = state.skillFocusMet || false;
        toggleLabel.textContent = toggleCheckbox.checked ? 'Met' : 'Not Met';
        toggleLabel.className = 'toggle-label ' + (toggleCheckbox.checked ? 'met' : 'not-met');
        document.getElementById('currentLesson').value = state.currentLesson || '';
        document.getElementById('homework').value = state.homework || '';
        document.getElementById('activitiesFinished').value = state.activitiesFinished || '';
        document.getElementById('activitiesNotFinished').value = state.activitiesNotFinished || '';
        document.getElementById('studentGender').value = state.studentGender || 'Male';
        document.getElementById('wpmInitial').value = state.wpmInitial || '';
        document.getElementById('gbwtInitial').value = state.gbwtInitial || '';
        document.getElementById('readingLevelInitial').value = state.readingLevelInitial || '';
        document.getElementById('interviewScore').value = state.interviewScore || '';
        // Ratings
        const ratingFields = ['attention', 'retention', 'comprehension', 'behavior', 'handwriting', 'conversation'];
        ratingFields.forEach(name => {
            const val = parseInt(state[name]) || 0;
            document.getElementById(name).value = val;
            const ratingEl = document.querySelector(`.star-rating[data-rating="${name}"]`);
            if (ratingEl) updateStarDisplay(ratingEl, val);
        });
        // Scores
        document.getElementById('scoreBookMaterials').value = state.scoreBookMaterials || '';
        document.getElementById('totalBookMaterials').value = state.totalBookMaterials || '';
        document.getElementById('scoreVocabulary').value = state.scoreVocabulary || '';
        document.getElementById('totalVocabulary').value = state.totalVocabulary || '';
        document.getElementById('scoreClassVideo').value = state.scoreClassVideo || '';
        document.getElementById('totalClassVideo').value = state.totalClassVideo || '';
        document.getElementById('scoreHomework').value = state.scoreHomework || '';
        document.getElementById('totalHomework').value = state.totalHomework || '';
        document.getElementById('scoreHomeworkVocab').value = state.scoreHomeworkVocab || '';
        document.getElementById('totalHomeworkVocab').value = state.totalHomeworkVocab || '';
        document.getElementById('scoreWeeklyTest').value = state.scoreWeeklyTest || '';
        document.getElementById('totalWeeklyTest').value = state.totalWeeklyTest || '';
        // Trigger subject change to load skills section
        subjectSelect.dispatchEvent(new Event('change'));
    }

    function clearFormFields() {
        reportForm.reset();
        reportOutput.classList.remove('show');
        dateInput.value = today.toISOString().split('T')[0];
        updateDayOfWeek();
        studentSearchInput.value = '';
        studentNameHidden.value = '';
        studentIdInput.value = '';
        document.getElementById('wpmInitial').value = '';
        document.getElementById('gbwtInitial').value = '';
        document.getElementById('readingLevelInitial').value = '';
        document.getElementById('interviewScore').value = '';
        teacherSearchInput.value = '';
        teacherNameHidden.value = '';
        teacherIdInput.value = '';
        skillFocusSearchInput.value = '';
        skillFocusHidden.value = '';
        const toggleCheckbox = document.getElementById('skillFocusMet');
        const toggleLabel = document.getElementById('toggleLabel');
        toggleCheckbox.checked = false;
        toggleLabel.textContent = 'Not Met';
        toggleLabel.classList.remove('met');
        toggleLabel.classList.add('not-met');
        const starRatings = document.querySelectorAll('.star-rating');
        starRatings.forEach(rating => {
            const ratingName = rating.getAttribute('data-rating');
            document.getElementById(ratingName).value = 0;
            updateStarDisplay(rating, 0);
        });
        hideDropdown();
        hideTeacherDropdown();
        hideFocusSkillDropdown();
    }

    function switchMode(newMode) {
        if (newMode === currentMode) return;

        // Save current form state to draft cache
        draftCache[currentMode] = captureFormState();

        // Update mode
        currentMode = newMode;
        document.getElementById('classType').value = newMode === 'online' ? 'Online' : 'In-Person';

        // Toggle active tab
        document.querySelectorAll('.tab-btn[data-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === newMode);
        });

        // Toggle online mode indicator + body class
        const indicator = document.getElementById('modeIndicator');
        const pageTitle = document.getElementById('pageTitle');
        if (newMode === 'online') {
            indicator.classList.remove('hidden');
            document.body.classList.add('online-mode');
            pageTitle.textContent = '🌐 ICAN STELLAR ONLINE REPORT 🌟';
        } else {
            indicator.classList.add('hidden');
            document.body.classList.remove('online-mode');
            pageTitle.textContent = '🚀 ICAN STELLAR DAILY REPORT 🌟';
        }

        // Restore cached form data or clear form
        if (draftCache[newMode]) {
            restoreFormState(draftCache[newMode]);
        } else {
            clearFormFields();
        }

        // Hide any displayed report output
        reportOutput.classList.remove('show');
    }

    function updateDayOfWeek() {
        const date = new Date(dateInput.value);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[date.getDay()];

        // Always display the actual day
        dayOfWeekInput.value = dayName;

        // Show a note for weekends
        if (dayName === 'Sunday' || dayName === 'Saturday') {
            dayOfWeekInput.style.color = '#666';
            dayOfWeekInput.title = 'Weekend selected - reports are typically for weekdays';
        } else {
            dayOfWeekInput.style.color = '#333';
            dayOfWeekInput.title = '';
        }
    }

    function initializeToggleSwitch() {
        const toggleCheckbox = document.getElementById('skillFocusMet');
        const toggleLabel = document.getElementById('toggleLabel');

        toggleCheckbox.addEventListener('change', function() {
            if (this.checked) {
                toggleLabel.textContent = 'Met';
                toggleLabel.classList.remove('not-met');
                toggleLabel.classList.add('met');
            } else {
                toggleLabel.textContent = 'Not Met';
                toggleLabel.classList.remove('met');
                toggleLabel.classList.add('not-met');
            }
        });
    }
    
    function initializeStarRatings() {
        const starRatings = document.querySelectorAll('.star-rating');
        
        starRatings.forEach(rating => {
            const stars = rating.querySelectorAll('.star');
            const ratingName = rating.getAttribute('data-rating');
            const hiddenInput = document.getElementById(ratingName);
            
            stars.forEach((star, index) => {
                // Click event
                star.addEventListener('click', () => {
                    const value = parseInt(star.getAttribute('data-value'));
                    hiddenInput.value = value;
                    updateStarDisplay(rating, value);
                });
                
                // Hover events
                star.addEventListener('mouseenter', () => {
                    const value = parseInt(star.getAttribute('data-value'));
                    highlightStars(rating, value);
                });
                
                rating.addEventListener('mouseleave', () => {
                    const currentValue = parseInt(hiddenInput.value);
                    updateStarDisplay(rating, currentValue);
                });
            });
        });
    }
    
    function updateStarDisplay(rating, value) {
        const stars = rating.querySelectorAll('.star');
        stars.forEach((star, index) => {
            const starValue = parseInt(star.getAttribute('data-value'));
            if (starValue <= value) {
                star.classList.add('active');
                star.classList.remove('hover');
            } else {
                star.classList.remove('active');
                star.classList.remove('hover');
            }
        });
    }
    
    function highlightStars(rating, value) {
        const stars = rating.querySelectorAll('.star');
        stars.forEach((star, index) => {
            const starValue = parseInt(star.getAttribute('data-value'));
            if (starValue <= value) {
                star.classList.add('hover');
            } else {
                star.classList.remove('hover');
            }
        });
    }

    function renderSkills(skills) {
        skillsContainer.innerHTML = '';
        skills.forEach((skill, index) => {
            const skillId = `skill-${index}`;
            const skillElement = document.createElement('div');
            skillElement.classList.add('skill-item');
            skillElement.innerHTML = `
                <div class="skill-header">
                    <h3>${skill.skill}</h3>
                    <div class="skill-na-option">
                        <input type="checkbox" id="${skillId}-na" name="${skillId}-na">
                        <label for="${skillId}-na">N/A</label>
                    </div>
                </div>
                <div class="microskills-grid">
                    ${skill.microskills.map((ms, msIndex) => `
                        <div class="microskill-item">
                            <input type="checkbox" id="${skillId}-ms-${msIndex}" name="${skillId}-ms" value="${ms}">
                            <label for="${skillId}-ms-${msIndex}">${ms}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="skill-score">
                    Score: <span id="${skillId}-score">5</span>/5
                </div>
            `;
            skillsContainer.appendChild(skillElement);

            const naCheckbox = document.getElementById(`${skillId}-na`);
            const microskillCheckboxes = document.querySelectorAll(`input[name="${skillId}-ms"]`);
            const scoreElement = document.getElementById(`${skillId}-score`);

            naCheckbox.addEventListener('change', () => {
                if (naCheckbox.checked) {
                    microskillCheckboxes.forEach(cb => {
                        cb.checked = false;
                        cb.disabled = true;
                    });
                    scoreElement.textContent = 'NA';
                } else {
                    microskillCheckboxes.forEach(cb => cb.disabled = false);
                    updateScore();
                }
            });

            microskillCheckboxes.forEach(cb => {
                cb.addEventListener('change', updateScore);
            });

            function updateScore() {
                if (naCheckbox.checked) return;
                const checkedCount = document.querySelectorAll(`input[name="${skillId}-ms"]:checked`).length;
                const score = 5 - checkedCount;
                scoreElement.textContent = score;
            }
        });
    }
    
    // Handle form submission
    reportForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validation
        const studentName = document.getElementById('studentName').value.trim();
        const teacherName = document.getElementById('teacherName').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const skillFocus = document.getElementById('skillFocus').value.trim();
        const materials = document.getElementById('materials').value.trim();
        const currentLesson = document.getElementById('currentLesson').value.trim();
        const homework = document.getElementById('homework').value.trim();
        const activitiesFinished = document.getElementById('activitiesFinished').value.trim();
        const activitiesNotFinished = document.getElementById('activitiesNotFinished').value.trim();

        // Check all 6 ratings
        const attention = parseInt(document.getElementById('attention').value);
        const retention = parseInt(document.getElementById('retention').value);
        const comprehension = parseInt(document.getElementById('comprehension').value);
        const behavior = parseInt(document.getElementById('behavior').value);
        const handwriting = parseInt(document.getElementById('handwriting').value);
        const conversation = parseInt(document.getElementById('conversation').value);

        const errors = [];

        if (!studentName) errors.push('Student Name');
        if (!teacherName) errors.push('Teacher Name');
        if (!subject) errors.push('Subject');
        if (!skillFocus) errors.push('Skill Focus');
        if (!materials) errors.push('Materials');
        if (!currentLesson) errors.push('Current Lesson');
        if (!homework) errors.push('Homework');
        if (!activitiesFinished) errors.push('Activities Finished Today');
        if (!activitiesNotFinished) errors.push('Activities Did NOT Finish Today');

        // Check all ratings are filled
        if (attention === 0) errors.push('Attention Rating');
        if (retention === 0) errors.push('Retention Rating');
        if (comprehension === 0) errors.push('Comprehension Rating');
        if (behavior === 0) errors.push('Behavior Rating');
        if (handwriting === 0) errors.push('Handwriting Rating');
        if (conversation === 0) errors.push('Conversation Rating');

        if (errors.length > 0) {
            alert('Please fill in the following required fields:\n\n' + errors.join('\n'));
            return;
        }

        // Show confirmation dialog before generating report
        const confirmMessage = `⚠️ PLEASE CONFIRM BEFORE GENERATING REPORT\n\n` +
            `This action will:\n` +
            `✓ Consume AI tokens (costs money)\n` +
            `✓ Save data permanently to the database\n` +
            `✓ Create a duplicate entry if sent again\n\n` +
            `Please review all data carefully before proceeding.\n\n` +
            `Class Type: ${document.getElementById('classType').value}\n` +
            `Student: ${studentName}\n` +
            `Teacher: ${teacherName}\n` +
            `Subject: ${subject}\n` +
            `Date: ${document.getElementById('date').value}\n\n` +
            `Do you want to generate this report?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        generateReport();
    });
    
    // Handle clear form
    clearFormBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear the form?')) {
            clearFormFields();
            draftCache[currentMode] = null;
        }
    });
    
    async function generateReport() {
        const studentName = document.getElementById('studentName').value;
        const teacherName = document.getElementById('teacherName').value;
        const date = document.getElementById('date').value;
        const dayOfWeek = document.getElementById('dayOfWeek').value;
        const subject = document.getElementById('subject').value;


        const ratings = {
            attention: document.getElementById('attention').value,
            retention: document.getElementById('retention').value,
            comprehension: document.getElementById('comprehension').value,
            behavior: document.getElementById('behavior').value,
            handwriting: document.getElementById('handwriting').value,
            conversation: document.getElementById('conversation').value,
        };

        const skills = {};
        const skillElements = document.querySelectorAll('.skill-item');
        skillElements.forEach((skillElement, index) => {
            const skillId = `skill-${index}`;
            const skillName = skillElement.querySelector('h3').textContent;
            const naCheckbox = document.getElementById(`${skillId}-na`);
            const scoreElement = document.getElementById(`${skillId}-score`);
            
            if (naCheckbox.checked) {
                skills[skillName] = { score: 'NA', weaknesses: [] };
            } else {
                const weaknesses = Array.from(document.querySelectorAll(`input[name="${skillId}-ms"]:checked`)).map(cb => cb.value);
                skills[skillName] = {
                    score: parseInt(scoreElement.textContent, 10),
                    weaknesses: weaknesses,
                };
            }
        });

        const skillFocus = document.getElementById('skillFocus').value;
        const skillFocusMet = document.getElementById('skillFocusMet').checked;
        const currentLesson = document.getElementById('currentLesson').value;
        const homework = document.getElementById('homework').value;
        const activitiesFinished = document.getElementById('activitiesFinished').value;
        const activitiesNotFinished = document.getElementById('activitiesNotFinished').value;
        const studentGender = document.getElementById('studentGender').value;

        // Capture scores
        const scores = {
            bookMaterials: {
                score: document.getElementById('scoreBookMaterials').value,
                total: document.getElementById('totalBookMaterials').value
            },
            vocabulary: {
                score: document.getElementById('scoreVocabulary').value,
                total: document.getElementById('totalVocabulary').value
            },
            classVideo: {
                score: document.getElementById('scoreClassVideo').value,
                total: document.getElementById('totalClassVideo').value
            },
            homework: {
                score: document.getElementById('scoreHomework').value,
                total: document.getElementById('totalHomework').value
            },
            homeworkVocab: {
                score: document.getElementById('scoreHomeworkVocab').value,
                total: document.getElementById('totalHomeworkVocab').value
            },
            weeklyTest: {
                score: document.getElementById('scoreWeeklyTest').value,
                total: document.getElementById('totalWeeklyTest').value
            }
        };

        function getSkillsTable(skills) {
            if (Object.keys(skills).length === 0) {
                return '';
            }

            let skillsTableHTML = '<div class="report-skills-section"><h3 class="section-title">Skills Assessment</h3><div class="skills-table"><table><thead><tr><th>Skill</th><th>Score</th><th>Weaknesses</th></tr></thead><tbody>';
            for (const [skill, data] of Object.entries(skills)) {
                const weaknesses = data.weaknesses.join(', ');
                skillsTableHTML += `<tr><td>${skill}</td><td>${data.score}</td><td>${weaknesses || 'N/A'}</td></tr>`;
            }
            skillsTableHTML += '</tbody></table></div></div>';
            return skillsTableHTML;
        }

        function getScoresTable(scores) {
            const scoreItems = [
                { label: 'Book/Materials', key: 'bookMaterials' },
                { label: 'Vocabulary', key: 'vocabulary' },
                { label: 'Class Video', key: 'classVideo' },
                { label: 'Homework', key: 'homework' },
                { label: 'Homework: Vocabulary', key: 'homeworkVocab' },
                { label: 'Weekly Test', key: 'weeklyTest' }
            ];

            // Check if any scores were entered
            const hasScores = scoreItems.some(item =>
                scores[item.key].score !== '' || scores[item.key].total !== ''
            );

            if (!hasScores) {
                return '';
            }

            // Build table HTML with 3 columns: Item, Score, Bar
            let scoresTableHTML = '<div class="scores-table"><table><thead><tr><th>Item</th><th>Score</th><th>Performance</th></tr></thead><tbody>';

            scoreItems.forEach(item => {
                const score = scores[item.key].score;
                const total = scores[item.key].total;

                if (score !== '' || total !== '') {
                    const displayScore = score !== '' ? score : '-';
                    const displayTotal = total !== '' ? total : '-';

                    // Calculate percentage for bar (only if both values are valid numbers)
                    let barHTML = '<span style="color: #94a3b8;">N/A</span>';
                    if (score !== '' && total !== '' && !isNaN(score) && !isNaN(total) && total > 0) {
                        const percentage = (parseFloat(score) / parseFloat(total)) * 100;
                        let barClass = 'low';
                        if (percentage >= 80) barClass = 'high';
                        else if (percentage >= 50) barClass = 'medium';

                        barHTML = `
                            <div class="score-bar-container">
                                <div class="score-bar-fill ${barClass}" style="width: ${percentage}%"></div>
                                <div class="score-bar-percentage">${percentage.toFixed(0)}%</div>
                            </div>
                        `;
                    }

                    // Add row with 3 columns
                    scoresTableHTML += `<tr><td>${item.label}</td><td>${displayScore}/${displayTotal}</td><td>${barHTML}</td></tr>`;
                }
            });

            scoresTableHTML += '</tbody></table></div>';

            return `<div class="report-scores-section"><h3 class="section-title">Scores</h3>${scoresTableHTML}</div>`;
        }

        const classType = document.getElementById('classType').value;
        const formData = {
            studentName,
            teacherName,
            date,
            dayOfWeek,
            subject,
            ratings,
            skills,
            skillFocus,
            skillFocusMet,
            currentLesson,
            homework,
            activitiesFinished,
            activitiesNotFinished,
            studentGender,
            scores,
            classType,
            wpmInitial: document.getElementById('wpmInitial').value,
            gbwtInitial: document.getElementById('gbwtInitial').value,
            readingLevelInitial: document.getElementById('readingLevelInitial').value,
            interviewScore: document.getElementById('interviewScore').value,
        };
        
        // Generate report HTML
        const isOnline = classType === 'Online';
        const reportTitleText = isOnline ? 'ICAN STELLAR ONLINE REPORT' : 'ICAN STELLAR DAILY REPORT';
        const onlineBadgeHTML = isOnline ? '<div style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-top: 8px; letter-spacing: 1px;">ONLINE CLASS</div>' : '';
        const reportHTML = `
            <div class="report-card">
                <div class="report-header">
                    <h2 class="report-title">${reportTitleText}</h2>
                    ${onlineBadgeHTML}
                </div>
                
                <div class="report-body">
                    <div class="report-main">
                        <!-- Student Profile -->
                        <div class="report-info-section">
                            <h3 class="section-title">👤 Student Profile</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Student:</span>
                                    <span class="info-value">${studentName.toUpperCase()}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">ID:</span>
                                    <span class="info-value">${document.getElementById('studentId').value || '#N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Date:</span>
                                    <span class="info-value">${date}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Day:</span>
                                    <span class="info-value">${dayOfWeek}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Grade Level:</span>
                                    <span class="info-value">${document.getElementById('gradeLevel').value || 'TBD'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">WPM Initial:</span>
                                    <span class="info-value">${document.getElementById('wpmInitial').value || 'TBD'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">GBWT Initial:</span>
                                    <span class="info-value">${document.getElementById('gbwtInitial').value || 'TBD'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Reading Level Initial:</span>
                                    <span class="info-value">${document.getElementById('readingLevelInitial').value || 'TBD'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Interview Score:</span>
                                    <span class="info-value">${document.getElementById('interviewScore').value || 'TBD'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Class Details -->
                        <div class="report-info-section">
                            <h3 class="section-title">📚 Class Details</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Teacher:</span>
                                    <span class="info-value">${extractFirstName(teacherName)}${document.getElementById('isSubstitute').checked ? ' <span style="background-color: #fbbf24; color: #78350f; padding: 2px 6px; border-radius: 3px; font-size: 0.75em; font-weight: 600; margin-left: 4px;">SUB</span>' : ''}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Teacher ID:</span>
                                    <span class="info-value">${document.getElementById('teacherId').value || '#N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Subject:</span>
                                    <span class="info-value">${subject}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Materials:</span>
                                    <span class="info-value">${document.getElementById('materials').value || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Current Lesson:</span>
                                    <span class="info-value">${currentLesson || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Homework:</span>
                                    <span class="info-value">${homework || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Skill Focus (SF):</span>
                                    <span class="info-value">${skillFocus || 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">SF Met?</span>
                                    <span class="info-value" style="color: ${skillFocusMet ? '#22c55e' : '#ef4444'}; font-weight: 700;">${skillFocusMet ? 'YES' : 'NO'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="report-ratings-section">
                            <h3 class="section-title">Class Participation</h3>
                            <div class="ratings-grid">
                                <div class="rating-item">
                                    <span class="rating-label">Attention</span>
                                    <span class="rating-stars">${getStars(ratings.attention)}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Retention</span>
                                    <span class="rating-stars">${getStars(ratings.retention)}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Comprehension</span>
                                    <span class="rating-stars">${getStars(ratings.comprehension)}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Behavior</span>
                                    <span class="rating-stars">${getStars(ratings.behavior)}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Handwriting</span>
                                    <span class="rating-stars">${getStars(ratings.handwriting)}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Conversation</span>
                                    <span class="rating-stars">${getStars(ratings.conversation)}</span>
                                </div>
                            </div>
                        </div>

                        ${getSkillsTable(skills)}

                        ${getScoresTable(scores)}

                        <div class="report-comments-section">
                            <h3 class="section-title">Written Report</h3>
                            <div class="narrative-container">
                                <div class="narrative-text" id="narrativeDisplay">Generating narrative report...</div>
                                <textarea class="narrative-textarea hidden" id="narrativeTextarea"></textarea>
                                <div class="narrative-controls">
                                    <button class="edit-narrative-btn" id="editNarrativeBtn" onclick="editNarrative()">✏️ Edit Report</button>
                                    <button class="save-narrative-btn hidden" id="saveNarrativeBtn" onclick="saveNarrative()">💾 Save</button>
                                    <button class="revert-narrative-btn hidden" id="revertNarrativeBtn" onclick="revertNarrative()">↩️ Revert</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="report-actions">
                    <button class="download-button" onclick="downloadReportAsImage()">📸 Download as Image</button>
                </div>
            </div>
        `;
        
        reportOutput.innerHTML = reportHTML;
        reportOutput.classList.add('show');

        // Scroll to report
        reportOutput.scrollIntoView({ behavior: 'smooth' });

        // Show loading message
        document.getElementById('narrativeDisplay').innerHTML = '<div style="text-align: center; padding: 20px; color: #666;"><div class="loading-spinner" style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>Generating AI narrative...</div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>';

        // Generate or enhance narrative with AI
        try {
            const response = await fetch('/api/generate-narrative', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                const narrativeDisplay = document.getElementById('narrativeDisplay');
                const narrativeTextarea = document.getElementById('narrativeTextarea');

                // Highlight AI-identified positive and negative phrases in the narrative
                const highlightedNarrative = highlightSentimentAI(result.narrative, result.sentiment);

                narrativeDisplay.innerHTML = highlightedNarrative;
                narrativeTextarea.value = result.narrative;

                // Store original narrative for revert functionality
                window.originalNarrative = result.narrative;
            } else {
                document.getElementById('narrativeDisplay').innerHTML = '<div style="color: #e74c3c; padding: 15px; background: #fee; border-radius: 8px; border: 1px solid #e74c3c;">⚠️ AI narrative generation failed. Click "Edit" below to write your own narrative, then download the report.</div>';
                document.getElementById('narrativeTextarea').value = '';
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('narrativeDisplay').innerHTML = '<div style="color: #e74c3c; padding: 15px; background: #fee; border-radius: 8px; border: 1px solid #e74c3c;">⚠️ AI service unavailable. Click "Edit" below to write your own narrative, then download the report.</div>';
            document.getElementById('narrativeTextarea').value = '';
        }
    }

    // Narrative editing functions
    window.editNarrative = function() {
        const narrativeDisplay = document.getElementById('narrativeDisplay');
        const narrativeTextarea = document.getElementById('narrativeTextarea');
        const editBtn = document.getElementById('editNarrativeBtn');
        const saveBtn = document.getElementById('saveNarrativeBtn');
        const revertBtn = document.getElementById('revertNarrativeBtn');

        // Switch to edit mode
        narrativeDisplay.classList.add('hidden');
        narrativeTextarea.classList.remove('hidden');
        editBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
        revertBtn.classList.remove('hidden');

        narrativeTextarea.focus();
    };

    window.saveNarrative = function() {
        const narrativeDisplay = document.getElementById('narrativeDisplay');
        const narrativeTextarea = document.getElementById('narrativeTextarea');
        const editBtn = document.getElementById('editNarrativeBtn');
        const saveBtn = document.getElementById('saveNarrativeBtn');
        const revertBtn = document.getElementById('revertNarrativeBtn');

        // Save the edited text
        narrativeDisplay.innerHTML = narrativeTextarea.value;

        // Switch back to display mode
        narrativeDisplay.classList.remove('hidden');
        narrativeTextarea.classList.add('hidden');
        editBtn.classList.remove('hidden');
        saveBtn.classList.add('hidden');
        revertBtn.classList.add('hidden');
    };

    window.revertNarrative = function() {
        const narrativeDisplay = document.getElementById('narrativeDisplay');
        const narrativeTextarea = document.getElementById('narrativeTextarea');
        const editBtn = document.getElementById('editNarrativeBtn');
        const saveBtn = document.getElementById('saveNarrativeBtn');
        const revertBtn = document.getElementById('revertNarrativeBtn');

        // Revert to original AI-generated text
        narrativeTextarea.value = window.originalNarrative;
        narrativeDisplay.innerHTML = window.originalNarrative;

        // Switch back to display mode
        narrativeDisplay.classList.remove('hidden');
        narrativeTextarea.classList.add('hidden');
        editBtn.classList.remove('hidden');
        saveBtn.classList.add('hidden');
        revertBtn.classList.add('hidden');
    };
    
    function getStars(rating) {
        const num = parseInt(rating);
        if (num === 0) return '☆☆☆☆☆';
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= num ? '★' : '☆';
        }
        return stars;
    }
    
    // Make downloadReportAsImage available globally
    window.downloadReportAsImage = async function() {
        try {
            const reportElement = document.querySelector('.report-card');
            if (!reportElement) {
                alert('No report found to download');
                return;
            }

            // Hide the action buttons temporarily
            const actionsElement = reportElement.querySelector('.report-actions');
            if (actionsElement) {
                actionsElement.style.display = 'none';
            }

            // Store original styles
            const originalOverflow = reportElement.style.overflow;
            const originalWidth = reportElement.style.width;

            // Set fixed width and hide overflow to prevent edge issues
            reportElement.style.overflow = 'hidden';
            reportElement.style.width = reportElement.offsetWidth + 'px';

            // Force a reflow to ensure proper sizing
            reportElement.offsetHeight;

            // Generate canvas with better settings
            const canvas = await html2canvas(reportElement, {
                backgroundColor: '#1a1a2e',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                scrollX: 0,
                scrollY: -window.scrollY,
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight,
                width: reportElement.offsetWidth,
                height: reportElement.offsetHeight
            });

            // Restore original styles
            reportElement.style.overflow = originalOverflow;
            reportElement.style.width = originalWidth;
            
            // Show the action buttons again
            if (actionsElement) {
                actionsElement.style.display = 'block';
            }
            
            // Create download link
            const link = document.createElement('a');
            const studentName = document.getElementById('studentName').value.replace(/\s+/g, '-') || 'student';
            const today = new Date().toISOString().split('T')[0];
            link.download = `ican-stellar-report-${studentName}-${today}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Error generating report image. Please try again.');
        }
    };
});