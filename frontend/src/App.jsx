import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [highlightText, setHighlightText] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [studySets, setStudySets] = useState([]);
  const [studySourceType, setStudySourceType] = useState('document');
  const [studySourceId, setStudySourceId] = useState('');
  const [studySourceIds, setStudySourceIds] = useState([]);
  const [studySetName, setStudySetName] = useState('');
  const [studyCardCount, setStudyCardCount] = useState(10);
  const [studyLoading, setStudyLoading] = useState(false);
  const [selectedStudySet, setSelectedStudySet] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [quizSourceType, setQuizSourceType] = useState('document');
  const [quizSourceId, setQuizSourceId] = useState('');
  const [quizSourceIds, setQuizSourceIds] = useState([]);
  const [quizName, setQuizName] = useState('');
  const [quizQuestionCount, setQuizQuestionCount] = useState(10);
  const [quizTypes, setQuizTypes] = useState(['multiple_choice', 'true_false', 'short_answer']);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [courseQuizAttempts, setCourseQuizAttempts] = useState([]);
  const [quizMetrics, setQuizMetrics] = useState(null);
  const [courseQuizMetrics, setCourseQuizMetrics] = useState(null);
  const [quizHistoryScope, setQuizHistoryScope] = useState('quiz');
  const [quizInsightsLoading, setQuizInsightsLoading] = useState(false);
  const [improvementAreas, setImprovementAreas] = useState([]);
  const [improvementLoading, setImprovementLoading] = useState(false);
  const [courseTab, setCourseTab] = useState('materials');
  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const [missedFocusAreas, setMissedFocusAreas] = useState([]);
  const [missedFocusLoading, setMissedFocusLoading] = useState(false);
  const [selectedMissedChunkIds, setSelectedMissedChunkIds] = useState([]);
  const [newTopicLabel, setNewTopicLabel] = useState('');
  const [topicCreating, setTopicCreating] = useState(false);
  const [topicAttachTarget, setTopicAttachTarget] = useState('');
  const [topicAttachDocIds, setTopicAttachDocIds] = useState([]);
  const [topicAttachLoading, setTopicAttachLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchDocuments(selectedCourse);
      fetchTopics(selectedCourse);
      fetchStudySets(selectedCourse);
      fetchQuizzes(selectedCourse);
      fetchTrackingData(selectedCourse); // eslint-disable-line react-hooks/exhaustive-deps
      setCourseTab('materials');
    } else {
      setDocuments([]);
      setTopics([]);
      setStudySets([]);
      setQuizzes([]);
      setSelectedStudySet(null);
      setSelectedQuiz(null);
      setFlashcards([]);
      setStudySourceId('');
      setStudySourceIds([]);
      setQuizSourceId('');
      setQuizSourceIds([]);
      setQuizQuestions([]);
      setQuizAnswers({});
      setQuizResults(null);
      setQuizAttempts([]);
      setCourseQuizAttempts([]);
      setQuizMetrics(null);
      setCourseQuizMetrics(null);
      setQuizHistoryScope('quiz');
      setImprovementAreas([]);
      setMissedFocusAreas([]);
      setMissedFocusLoading(false);
      setSelectedMissedChunkIds([]);
      setTopicAttachTarget('');
      setTopicAttachDocIds([]);
      setTopicAttachLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedStudySet?.studyset_id) {
      setFlashcards([]);
      return;
    }

    fetchFlashcards(selectedStudySet.studyset_id);
  }, [selectedStudySet]);

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:8000/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const fetchDocuments = async (courseId) => {
    try {
      const response = await fetch(`http://localhost:8000/courses/${courseId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const fetchTopics = async (courseId) => {
    try {
      const response = await fetch(`http://localhost:8000/courses/${courseId}/topics`);
      if (response.ok) {
        const data = await response.json();
        setTopics(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    }
  };

  const fetchStudySets = async (courseId) => {
    try {
      const response = await fetch(`http://localhost:8000/courses/${courseId}/study-sets`);
      if (response.ok) {
        const data = await response.json();
        setStudySets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch study sets:', err);
    }
  };

  const fetchQuizzes = async (courseId) => {
    try {
      const response = await fetch(`http://localhost:8000/courses/${courseId}/quizzes`);
      if (response.ok) {
        const data = await response.json();
        setQuizzes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    }
  };

  const fetchQuizAttempts = async (quizId) => {
    if (!quizId) return { attempts: [], summary: null };
    const response = await fetch(`http://localhost:8000/quizzes/${quizId}/attempts`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to load quiz attempts');
    }
    return response.json();
  };

  const fetchCourseQuizAttempts = async (courseId) => {
    if (!courseId) return { attempts: [] };
    const response = await fetch(`http://localhost:8000/courses/${courseId}/quiz-attempts`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to load course attempts');
    }
    return response.json();
  };

  const fetchQuizMetrics = async (quizId) => {
    if (!quizId) return null;
    const response = await fetch(`http://localhost:8000/quizzes/${quizId}/metrics`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to load quiz metrics');
    }
    return response.json();
  };

  const fetchCourseQuizMetrics = async (courseId) => {
    if (!courseId) return null;
    const response = await fetch(`http://localhost:8000/courses/${courseId}/quiz-metrics`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to load course metrics');
    }
    return response.json();
  };

  const refreshQuizInsights = async (quizId, courseId) => {
    if (!quizId || !courseId) return;
    setQuizInsightsLoading(true);
    try {
      const [quizAttemptsData, quizMetricsData, courseAttemptsData, courseMetricsData] = await Promise.all([
        fetchQuizAttempts(quizId),
        fetchQuizMetrics(quizId),
        fetchCourseQuizAttempts(courseId),
        fetchCourseQuizMetrics(courseId)
      ]);
      setQuizAttempts(Array.isArray(quizAttemptsData.attempts) ? quizAttemptsData.attempts : []);
      setQuizMetrics(quizMetricsData || null);
      setCourseQuizAttempts(Array.isArray(courseAttemptsData.attempts) ? courseAttemptsData.attempts : []);
      setCourseQuizMetrics(courseMetricsData || null);
    } catch (err) {
      console.error(err);
    } finally {
      setQuizInsightsLoading(false);
    }
  };

  const fetchTrackingData = async (courseId) => {
    if (!courseId) return;
    setMissedFocusLoading(true);
    try {
      const [attemptsData, metricsData, missedData] = await Promise.all([
        fetch(`http://localhost:8000/courses/${courseId}/quiz-attempts`).then(r => r.json()),
        fetch(`http://localhost:8000/courses/${courseId}/quiz-metrics`).then(r => r.json()),
        fetch(`http://localhost:8000/courses/${courseId}/missed-focus-areas`).then(r => r.json()),
      ]);
      setCourseQuizAttempts(Array.isArray(attemptsData.attempts) ? attemptsData.attempts : []);
      setCourseQuizMetrics(metricsData || null);
      setMissedFocusAreas(Array.isArray(missedData.areas) ? missedData.areas : []);
      setSelectedMissedChunkIds([]);
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setMissedFocusLoading(false);
    }
    await fetchImprovementAreas(courseId);
  };

  const fetchImprovementAreas = async (courseId) => {
    if (!courseId) return;
    setImprovementLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/courses/${courseId}/improvement-areas`);
      const data = await response.json();
      if (!response.ok) {
        console.error(data.detail || 'Failed to load improvement areas');
        setImprovementAreas([]);
        return;
      }
      const areaList = Array.isArray(data.areas)
        ? data.areas
        : (Array.isArray(data.weak_topics) ? data.weak_topics : []);
      setImprovementAreas(areaList);
    } catch (err) {
      console.error(err);
      setImprovementAreas([]);
    } finally {
      setImprovementLoading(false);
    }
  };

  const fetchFlashcards = async (studySetId) => {
    try {
      const response = await fetch(`http://localhost:8000/study-sets/${studySetId}/flashcards`);
      if (response.ok) {
        const data = await response.json();
        setFlashcards(Array.isArray(data.flashcards) ? data.flashcards : []);
        setFlashcardIndex(0);
        setFlashcardFlipped(false);
      }
    } catch (err) {
      console.error('Failed to fetch flashcards:', err);
    }
  };

  const createCourse = async () => {
    if (!newCourseName.trim()) {
      alert('Please enter a course name');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('name', newCourseName);
      
      const response = await fetch('http://localhost:8000/courses', {
        method: 'POST',
        body: params
      });
      const data = await response.json();
      setCourses([...courses, data]);
      setNewCourseName('');
      setSelectedCourse(data.course_id);
    } catch (err) {
      alert('Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async () => {
    if (!file || !selectedCourse) {
      alert('Please select a file and course');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('category', category === 'Custom' ? customCategory : category);

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/documents`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      alert(`Document ingested: ${data.ingestion_result?.num_chunks || 'N/A'} chunks`);
      setFile(null);
      setCategory('General');
      setCustomCategory('');
      fetchDocuments(selectedCourse);
    } catch (err) {
      alert('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId, courseName) => {
    if (!window.confirm(`Delete "${courseName}"? This will remove all documents and data.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/courses/${courseId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setCourses(courses.filter(c => c.course_id !== courseId));
        if (selectedCourse === courseId) {
          setSelectedCourse(null);
        }
      } else {
        alert('Failed to delete course');
      }
    } catch (err) {
      alert('Failed to delete course');
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = async (doc) => {
    setSelectedStudySet(null);
    setSelectedQuiz(null);
    setFlashcards([]);
    setSelectedDocument(doc);
    setLoadingDoc(true);
    try {
      const response = await fetch(`http://localhost:8000/documents/${doc.doc_id}/content`);
      if (response.ok) {
        const data = await response.json();
        setDocumentContent(data);
      } else {
        alert('Failed to load document');
        setSelectedDocument(null);
      }
    } catch (err) {
      alert('Failed to load document');
      setSelectedDocument(null);
    } finally {
      setLoadingDoc(false);
    }
  };

  const closeViewer = () => {
    setSelectedDocument(null);
    setDocumentContent(null);
    setHighlightText(null);
  };

  const openCitationDocument = async (citation) => {
    // Reuse the citation metadata to open the source document.
    const doc = {
      doc_id: citation.doc_id,
      title: citation.document || citation.doc_title,
      doc_type: citation.doc_type
    };
    
    setSelectedStudySet(null);
    setSelectedQuiz(null);
    setFlashcards([]);
    setSelectedDocument(doc);
    setHighlightText(citation.text || citation.snippet || null);
    setLoadingDoc(true);
    try {
      const response = await fetch(`http://localhost:8000/documents/${doc.doc_id}/content`);
      if (response.ok) {
        const data = await response.json();
        setDocumentContent(data);
      } else {
        alert('Failed to load document');
        setSelectedDocument(null);
        setHighlightText(null);
      }
    } catch (err) {
      alert('Failed to load document');
      setSelectedDocument(null);
      setHighlightText(null);
    } finally {
      setLoadingDoc(false);
    }
  };

  const sendQuestion = async () => {
    if (!chatInput.trim() || !selectedCourse) return;

    const question = chatInput;
    const userMessage = { role: 'user', content: question };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const formData = new FormData();
      formData.append('question', question);

      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/chat`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = {
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
          sources: data.num_sources
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        alert('Failed to get response');
      }
    } catch (err) {
      alert('Error sending message');
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const generateStudySet = async () => {
    if (!selectedCourse) {
      return;
    }

    if (studySourceType === 'document' && studySourceIds.length === 0) {
      alert('Please select at least one document.');
      return;
    }

    if (studySourceType === 'topic' && !studySourceId) {
      alert('Please select a topic.');
      return;
    }

    setStudyLoading(true);
    try {
      const formData = new FormData();
      formData.append('source_type', studySourceType);
      if (studySourceType === 'document') {
        formData.append('source_id', studySourceIds[0] || '');
        formData.append('source_ids_json', JSON.stringify(studySourceIds));
      } else {
        formData.append('source_id', studySourceId);
      }
      formData.append('card_count', String(studyCardCount));
      if (studySetName.trim()) {
        formData.append('name', studySetName.trim());
      }

      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/study-sets/generate`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.detail || 'Failed to generate study set');
        return;
      }

      setStudySetName('');
      await fetchStudySets(selectedCourse);
      const generatedStudySet = {
        studyset_id: data.studyset_id,
        course_id: data.course_id,
        name: data.name,
        source_scope: data.source_scope,
        source_id: data.source_id,
        card_count: data.card_count
      };
      setSelectedDocument(null);
      setSelectedStudySet(generatedStudySet);
    } catch (err) {
      alert('Failed to generate study set');
      console.error(err);
    } finally {
      setStudyLoading(false);
    }
  };

  const toggleStudyDocument = (docId) => {
    if (!docId) return;
    setStudySourceIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const autoDetectTopics = async () => {
    if (!selectedCourse) return;
    setStudyLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/topics/auto`, {
        method: 'POST'
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.detail || 'Failed to auto-detect topics');
        return;
      }
      await fetchTopics(selectedCourse);
    } catch (err) {
      console.error(err);
      alert('Failed to auto-detect topics');
    } finally {
      setStudyLoading(false);
    }
  };

  const createTopic = async () => {
    if (!selectedCourse) return;
    const label = newTopicLabel.trim();
    if (!label) {
      alert('Please enter a topic name');
      return;
    }

    setTopicCreating(true);
    try {
      const formData = new FormData();
      formData.append('label', label);

      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/topics`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.detail || 'Failed to create topic');
        return;
      }

      setNewTopicLabel('');
      await fetchTopics(selectedCourse);
    } catch (err) {
      console.error(err);
      alert('Failed to create topic');
    } finally {
      setTopicCreating(false);
    }
  };

  const toggleTopicAttachDoc = (docId) => {
    if (!docId) return;
    setTopicAttachDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleTopicAttachPanel = (topicId) => {
    if (topicAttachTarget === topicId) {
      setTopicAttachTarget('');
      setTopicAttachDocIds([]);
      return;
    }
    setTopicAttachTarget(topicId);
    setTopicAttachDocIds([]);
  };

  const attachDocumentsToTopic = async (topicId) => {
    if (!selectedCourse || !topicId) return;
    if (topicAttachDocIds.length === 0) {
      alert('Select at least one document to attach');
      return;
    }

    setTopicAttachLoading(true);
    try {
      const formData = new FormData();
      formData.append('doc_ids_json', JSON.stringify(topicAttachDocIds));
      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/topics/${topicId}/attach-documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404 && data.detail === 'Not Found') {
          alert('Attach Materials endpoint not found on backend. Restart StudyVault backend from the backend folder and try again.');
          return;
        }
        alert(data.detail || 'Failed to attach documents to topic');
        return;
      }

      await fetchTopics(selectedCourse);
      setTopicAttachDocIds([]);
      setTopicAttachTarget('');
      alert(`Attached ${data.mapped_chunks || 0} chunks (${data.new_links || 0} new) to topic.`);
    } catch (err) {
      console.error(err);
      alert('Failed to attach documents to topic');
    } finally {
      setTopicAttachLoading(false);
    }
  };

  const openStudySet = (studySet) => {
    setSelectedDocument(null);
    setDocumentContent(null);
    setHighlightText(null);
    setSelectedQuiz(null);
    setSelectedStudySet(studySet);
  };

  const closeStudySet = () => {
    setSelectedStudySet(null);
    setFlashcards([]);
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
  };

  const deleteStudySet = async (e, studySetId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this study set and all its flashcards?')) return;
    try {
      const res = await fetch(`http://localhost:8000/study-sets/${studySetId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || 'Failed to delete study set');
        return;
      }
      if (selectedStudySet?.studyset_id === studySetId) closeStudySet();
      await fetchStudySets(selectedCourse);
    } catch (err) {
      console.error(err);
      alert('Failed to delete study set');
    }
  };

  const nextFlashcard = () => {
    if (flashcardIndex < flashcards.length - 1) {
      setFlashcardIndex(flashcardIndex + 1);
      setFlashcardFlipped(false);
    }
  };

  const previousFlashcard = () => {
    if (flashcardIndex > 0) {
      setFlashcardIndex(flashcardIndex - 1);
      setFlashcardFlipped(false);
    }
  };

  const selectedFlashcard = flashcards[flashcardIndex] || null;

  const toggleQuizDocument = (docId) => {
    if (!docId) return;
    setQuizSourceIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleQuizType = (quizType) => {
    setQuizTypes((prev) => {
      if (prev.includes(quizType)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== quizType);
      }
      return [...prev, quizType];
    });
  };

  const generateQuiz = async () => {
    if (!selectedCourse) return;

    if (quizSourceType === 'document' && quizSourceIds.length === 0) {
      alert('Please select at least one document.');
      return;
    }

    if (quizSourceType === 'topic' && !quizSourceId) {
      alert('Please select a topic.');
      return;
    }

    if (quizTypes.length === 0) {
      alert('Please select at least one quiz type.');
      return;
    }

    setQuizLoading(true);
    try {
      const formData = new FormData();
      formData.append('source_type', quizSourceType);
      if (quizSourceType === 'document') {
        formData.append('source_id', quizSourceIds[0] || '');
        formData.append('source_ids_json', JSON.stringify(quizSourceIds));
      } else {
        formData.append('source_id', quizSourceId);
      }
      formData.append('question_count', String(quizQuestionCount));
      formData.append('quiz_types_json', JSON.stringify(quizTypes));
      if (quizName.trim()) {
        formData.append('name', quizName.trim());
      }

      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/quizzes/generate`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404 && data.detail === 'Not Found') {
          alert('Quiz endpoint not found on backend. Restart StudyVault backend from the backend folder and try again.');
          return;
        }
        alert(data.detail || 'Failed to generate quiz');
        return;
      }

      await fetchQuizzes(selectedCourse);
      setQuizName('');
      setSelectedDocument(null);
      setSelectedStudySet(null);
      setFlashcards([]);
      setQuizResults(null);
      setSelectedQuiz({
        quiz_id: data.quiz_id,
        name: data.name,
        mode: data.mode
      });
      setQuizQuestions(Array.isArray(data.questions) ? data.questions : []);
      setQuizQuestionIndex(0);
      setQuizAnswers({});
      setCourseTab('quizzes');
    } catch (err) {
      alert('Failed to generate quiz');
      console.error(err);
    } finally {
      setQuizLoading(false);
    }
  };

  const generateMissedFocusQuiz = async ({ chunkIds, title, missCount = 5 }) => {
    if (!selectedCourse || !Array.isArray(chunkIds) || chunkIds.length === 0) return;
    setQuizLoading(true);
    try {
      const formData = new FormData();
      formData.append('source_type', 'chunks');
      formData.append('source_id', '');
      formData.append('focus_chunk_ids_json', JSON.stringify(chunkIds));
      formData.append('question_count', String(Math.min(Math.max(missCount + 3, 5), 15)));
      formData.append('quiz_types_json', JSON.stringify(quizTypes));
      formData.append('name', `${title || 'Missed Sections'} – Focus Quiz`);

      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/quizzes/generate`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.detail || 'Failed to generate missed focus quiz');
        return;
      }

      await fetchQuizzes(selectedCourse);
      setSelectedDocument(null);
      setSelectedStudySet(null);
      setFlashcards([]);
      setQuizResults(null);
      setSelectedQuiz({ quiz_id: data.quiz_id, name: data.name, mode: data.mode });
      setQuizQuestions(Array.isArray(data.questions) ? data.questions : []);
      setQuizQuestionIndex(0);
      setQuizAnswers({});
      setCourseTab('quizzes');
      await refreshQuizInsights(data.quiz_id, selectedCourse);
      await fetchTrackingData(selectedCourse);
    } catch (err) {
      console.error(err);
      alert('Failed to generate missed focus quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const toggleMissedSectionSelection = (chunkId) => {
    if (!chunkId) return;
    setSelectedMissedChunkIds((prev) =>
      prev.includes(chunkId) ? prev.filter((item) => item !== chunkId) : [...prev, chunkId]
    );
  };

  const generateFocusQuiz = async (topic) => {
    if (!selectedCourse || !topic?.topic_id) return;

    setQuizLoading(true);
    try {
      const formData = new FormData();
      formData.append('source_type', 'topic');
      formData.append('source_id', topic.topic_id);
      formData.append('question_count', String(topic.recommended_question_count || quizQuestionCount || 10));
      formData.append('quiz_types_json', JSON.stringify(quizTypes));
      formData.append('name', `${topic.label} Focus Quiz`);

      const response = await fetch(`http://localhost:8000/courses/${selectedCourse}/quizzes/generate`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.detail || 'Failed to generate focus quiz');
        return;
      }

      await fetchQuizzes(selectedCourse);
      setSelectedDocument(null);
      setSelectedStudySet(null);
      setFlashcards([]);
      setQuizResults(null);
      setSelectedQuiz({
        quiz_id: data.quiz_id,
        name: data.name,
        mode: data.mode
      });
      setQuizQuestions(Array.isArray(data.questions) ? data.questions : []);
      setQuizQuestionIndex(0);
      setQuizAnswers({});
      setCourseTab('quizzes');
      await refreshQuizInsights(data.quiz_id, selectedCourse);
    } catch (err) {
      console.error(err);
      alert('Failed to generate focus quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const openQuiz = async (quizItem) => {
    if (!quizItem?.quiz_id) return;
    setQuizLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/quizzes/${quizItem.quiz_id}`);
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404 && data.detail === 'Not Found') {
          alert('Quiz endpoint not found on backend. Restart StudyVault backend from the backend folder and try again.');
          return;
        }
        alert(data.detail || 'Failed to load quiz');
        return;
      }

      setSelectedDocument(null);
      setSelectedStudySet(null);
      setFlashcards([]);
      setSelectedQuiz({
        quiz_id: data.quiz.quiz_id,
        name: data.quiz.name,
        mode: data.quiz.mode,
      });
      setQuizQuestions(Array.isArray(data.questions) ? data.questions : []);
      setQuizQuestionIndex(0);
      setQuizAnswers({});
      setQuizResults(null);
      setQuizHistoryScope('quiz');
      await refreshQuizInsights(data.quiz.quiz_id, data.quiz.course_id);
    } catch (err) {
      alert('Failed to load quiz');
      console.error(err);
    } finally {
      setQuizLoading(false);
    }
  };

  const deleteQuiz = async (e, quizId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this quiz and all its attempts?')) return;
    try {
      const res = await fetch(`http://localhost:8000/quizzes/${quizId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || 'Failed to delete quiz');
        return;
      }
      if (selectedQuiz?.quiz_id === quizId) {
        setSelectedQuiz(null);
        setQuizQuestions([]);
        setQuizResults(null);
      }
      await fetchQuizzes(selectedCourse);
    } catch (err) {
      console.error(err);
      alert('Failed to delete quiz');
    }
  };

  const closeQuiz = () => {
    setSelectedQuiz(null);
    setQuizQuestions([]);
    setQuizQuestionIndex(0);
    setQuizAnswers({});
    setQuizResults(null);
    setQuizAttempts([]);
    setQuizMetrics(null);
    setQuizHistoryScope('quiz');
  };

  const loadQuizAttemptDetail = async (quizId, attemptId) => {
    if (!quizId || !attemptId) return;
    try {
      const response = await fetch(`http://localhost:8000/quizzes/${quizId}/attempts/${attemptId}`);
      const data = await response.json();
      if (!response.ok) {
        alert(data.detail || 'Failed to load attempt detail');
        return;
      }

      setSelectedQuiz({
        quiz_id: data.quiz.quiz_id,
        name: data.quiz.name,
        mode: data.quiz.mode,
      });
      setQuizResults({
        attempt_id: data.attempt.attempt_id,
        quiz_id: data.quiz.quiz_id,
        score: data.attempt.score,
        correct_count: data.correct_count,
        total_questions: data.total_questions,
        graded_responses: Array.isArray(data.graded_responses) ? data.graded_responses : []
      });
    } catch (err) {
      console.error(err);
      alert('Failed to load attempt detail');
    }
  };

  const openCourseAttemptDetail = async (attempt) => {
    if (!attempt?.quiz_id || !attempt?.attempt_id) return;
    const candidate = {
      quiz_id: attempt.quiz_id,
      name: attempt.quiz_name || 'Quiz',
      mode: 'practice'
    };
    await openQuiz(candidate);
    await loadQuizAttemptDetail(attempt.quiz_id, attempt.attempt_id);
  };

  const retakeSelectedQuiz = () => {
    setQuizQuestionIndex(0);
    setQuizAnswers({});
    setQuizResults(null);
  };

  const formatScorePercent = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return `${Math.round(Number(value) * 100)}%`;
  };

  const setQuizAnswer = (questionId, value) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const submitQuiz = async () => {
    if (!selectedQuiz?.quiz_id || quizQuestions.length === 0) return;

    const unanswered = quizQuestions.filter((question) => {
      const value = (quizAnswers[question.question_id] || '').toString().trim();
      return !value;
    });

    if (unanswered.length > 0) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setQuizSubmitting(true);
    try {
      const payload = {
        responses: quizQuestions.map((question) => ({
          question_id: question.question_id,
          user_answer: (quizAnswers[question.question_id] || '').toString()
        }))
      };

      const response = await fetch(`http://localhost:8000/quizzes/${selectedQuiz.quiz_id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 404 && data.detail === 'Not Found') {
          alert('Quiz endpoint not found on backend. Restart StudyVault backend from the backend folder and try again.');
          return;
        }
        alert(data.detail || 'Failed to submit quiz');
        return;
      }

      setQuizResults(data);
      await fetchQuizzes(selectedCourse);
      await refreshQuizInsights(selectedQuiz.quiz_id, selectedCourse);
      await fetchTrackingData(selectedCourse);
    } catch (err) {
      alert('Failed to submit quiz');
      console.error(err);
    } finally {
      setQuizSubmitting(false);
    }
  };

  const currentQuizQuestion = quizQuestions[quizQuestionIndex] || null;
  const historyItems = quizHistoryScope === 'course' ? courseQuizAttempts : quizAttempts;

  return (
    <div className="App">
      <div className={`app-container ${(selectedDocument || selectedStudySet || selectedQuiz) ? 'viewer-open' : ''}`}>
        <div className="sidebar">
        <h2>Courses</h2>
        
        <div className="course-list">
          {courses.map(course => (
            <div
              key={course.course_id}
              className={`course-item ${selectedCourse === course.course_id ? 'active' : ''}`}
            >
              <div onClick={() => setSelectedCourse(course.course_id)} style={{ flex: 1 }}>
                <div className="course-name">{course.name}</div>
                <div className="course-meta">
                  {course.term && <span>{course.term}</span>}
                </div>
              </div>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCourse(course.course_id, course.name);
                }}
                title="Delete course"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="create-course-section">
          <input
            type="text"
            placeholder="New course name"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createCourse()}
          />
          <button onClick={createCourse} disabled={loading} className="create-btn">
            + New Course
          </button>
        </div>
      </div>

      <div className="main-content">
        {selectedCourse ? (
          <div className="course-details">
            <h1>{courses.find(c => c.course_id === selectedCourse)?.name || 'Course'}</h1>

            <div className="course-tabs">
              <button
                className={`course-tab ${courseTab === 'materials' ? 'active' : ''}`}
                onClick={() => setCourseTab('materials')}
              >
                Materials
              </button>
              <button
                className={`course-tab ${courseTab === 'study' ? 'active' : ''}`}
                onClick={() => setCourseTab('study')}
              >
                Flashcards
              </button>
              <button
                className={`course-tab ${courseTab === 'quizzes' ? 'active' : ''}`}
                onClick={() => setCourseTab('quizzes')}
              >
                Quizzes
              </button>
              <button
                className={`course-tab ${courseTab === 'tracking' ? 'active' : ''}`}
                onClick={() => { setCourseTab('tracking'); fetchTrackingData(selectedCourse); }}
              >
                Tracking
              </button>
            </div>

            {courseTab === 'materials' && (
              <>

            <section className="topic-manager-section">
              <h2>Topics</h2>
              <div className="topic-manager-row">
                <input
                  type="text"
                  placeholder="Create a topic (e.g. Network Scanning)"
                  value={newTopicLabel}
                  onChange={(e) => setNewTopicLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createTopic()}
                  className="topic-manager-input"
                />
                <button onClick={createTopic} disabled={topicCreating || !newTopicLabel.trim()}>
                  {topicCreating ? 'Creating...' : 'Create Topic'}
                </button>
                <button onClick={autoDetectTopics} disabled={studyLoading}>
                  {studyLoading ? 'Detecting...' : 'Auto-detect Topics'}
                </button>
              </div>
              {topics.length === 0 ? (
                <div className="study-help-text">No topics yet. Create one manually or auto-detect from documents.</div>
              ) : (
                <div className="topic-manager-list">
                  {topics.map((topic) => (
                    <div key={topic.topic_id} className="topic-manager-item">
                      <div className="topic-manager-item-head">
                        <span>{topic.label}</span>
                        <span className="topic-manager-meta">{topic.chunk_count || 0} chunks</span>
                      </div>
                      <div className="topic-manager-actions">
                        <button
                          className="topic-attach-btn"
                          onClick={() => toggleTopicAttachPanel(topic.topic_id)}
                        >
                          {topicAttachTarget === topic.topic_id ? 'Cancel' : 'Add Materials'}
                        </button>
                      </div>
                      {topicAttachTarget === topic.topic_id && (
                        <div className="topic-attach-panel">
                          {documents.length === 0 ? (
                            <div className="study-help-text">Upload documents first to attach material.</div>
                          ) : (
                            <>
                              <div className="topic-attach-docs">
                                {documents.map((doc) => (
                                  <label key={`${topic.topic_id}-${doc.doc_id}`} className="topic-attach-doc-option">
                                    <input
                                      type="checkbox"
                                      checked={topicAttachDocIds.includes(doc.doc_id)}
                                      onChange={() => toggleTopicAttachDoc(doc.doc_id)}
                                    />
                                    <span>{doc.title}</span>
                                  </label>
                                ))}
                              </div>
                              <button
                                onClick={() => attachDocumentsToTopic(topic.topic_id)}
                                disabled={topicAttachLoading || topicAttachDocIds.length === 0}
                              >
                                {topicAttachLoading ? 'Attaching...' : 'Attach Selected Documents'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            
            <section className="upload-section">
              <h2>Upload Materials</h2>
              <div className="upload-container">
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="category-select"
                >
                  <option value="General">General</option>
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Textbook">Textbook</option>
                  <option value="Study Guide">Study Guide</option>
                  <option value="Practice Problems">Practice Problems</option>
                  <option value="Reference Material">Reference Material</option>
                  <option value="Custom">Custom...</option>
                </select>
                
                {category === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom category"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="custom-category-input"
                  />
                )}
                
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
                <button onClick={uploadDocument} disabled={loading || !file || (category === 'Custom' && !customCategory.trim())}>
                  {loading ? 'Uploading...' : 'Upload & Ingest'}
                </button>
              </div>
            </section>

            <section className="documents-section">
              <h2>Uploaded Documents</h2>
              {documents.length === 0 ? (
                <p className="empty-message">No documents uploaded yet</p>
              ) : (
                <div className="documents-list">
                  {Object.entries(
                    documents.reduce((groups, doc) => {
                      const cat = doc.category || 'General';
                      if (!groups[cat]) groups[cat] = [];
                      groups[cat].push(doc);
                      return groups;
                    }, {})
                  ).map(([categoryName, docs]) => (
                    <div key={categoryName} className="category-group">
                      <h3 className="category-header">{categoryName}</h3>
                      {docs.map(doc => (
                        <div 
                          key={doc.doc_id} 
                          className={`document-item ${selectedDocument?.doc_id === doc.doc_id ? 'viewing' : ''}`}
                          onClick={() => viewDocument(doc)}
                        >
                          <div className="doc-info">
                            <div className="doc-title">{doc.title}</div>
                            <div className="doc-meta">
                              <span className="doc-type">{doc.doc_type.toUpperCase()}</span>
                              <span className="doc-date">{new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="chat-section">
              <h2>Ask Questions</h2>
              <div className="chat-container">
                <div className="chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty">Ask a question about the uploaded materials...</div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`chat-message ${msg.role}`}>
                        <div className="message-content">{msg.content}</div>
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="message-citations">
                            <strong>Sources:</strong>
                            {msg.citations.map((cite, i) => (
                              <div 
                                key={i} 
                                className="citation"
                                onClick={() => openCitationDocument(cite)}
                              >
                                [{cite.rank}] {cite.document} (similarity: {cite.similarity.toFixed(3)})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {chatLoading && <div className="chat-message assistant"><div className="loading-indicator">Thinking...</div></div>}
                </div>
                <div className="chat-input-area">
                  <input
                    type="text"
                    placeholder="Ask anything about the course..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendQuestion()}
                    disabled={chatLoading || !selectedCourse}
                  />
                  <button onClick={sendQuestion} disabled={chatLoading || !chatInput.trim() || !selectedCourse}>
                    {chatLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </section>
              </>
            )}

            {courseTab === 'study' && (
            <section className="study-section">
              <h2>Flashcards</h2>
              <div className="study-controls">
                <div className="study-control-row">
                  <select
                    value={studySourceType}
                    onChange={(e) => {
                      setStudySourceType(e.target.value);
                      setStudySourceId('');
                      setStudySourceIds([]);
                    }}
                    className="study-input"
                  >
                    <option value="document">Document Source</option>
                    <option value="topic">Topic Source</option>
                  </select>

                  {studySourceType === 'topic' ? (
                    <select
                      value={studySourceId}
                      onChange={(e) => setStudySourceId(e.target.value)}
                      className="study-input"
                    >
                      <option value="">Select topic from this course</option>
                      {topics.map((item) => (
                        <option key={item.topic_id} value={item.topic_id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="study-doc-selector">
                      {documents.length === 0 ? (
                        <div className="study-help-text">Upload documents to enable flashcard generation.</div>
                      ) : (
                        documents.map((doc) => (
                          <label key={doc.doc_id} className="study-doc-option">
                            <input
                              type="checkbox"
                              checked={studySourceIds.includes(doc.doc_id)}
                              onChange={() => toggleStudyDocument(doc.doc_id)}
                            />
                            <span>{doc.title}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {studySourceType === 'topic' && topics.length === 0 && (
                  <div className="study-topic-empty">
                    <span className="study-help-text">No topics in this course yet.</span>
                    <button onClick={autoDetectTopics} disabled={studyLoading} className="study-generate-btn">
                      {studyLoading ? 'Detecting...' : 'Auto-detect Topics'}
                    </button>
                  </div>
                )}

                <div className="study-control-row">
                  <input
                    type="text"
                    placeholder="Study set name (optional)"
                    value={studySetName}
                    onChange={(e) => setStudySetName(e.target.value)}
                    className="study-input"
                  />
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={studyCardCount}
                    onChange={(e) => setStudyCardCount(Number(e.target.value) || 10)}
                    className="study-input study-count-input"
                  />
                  <button
                    onClick={generateStudySet}
                    disabled={
                      studyLoading ||
                      (studySourceType === 'document' && studySourceIds.length === 0) ||
                      (studySourceType === 'topic' && !studySourceId)
                    }
                    className="study-generate-btn"
                  >
                    {studyLoading ? 'Generating...' : 'Generate Flashcards'}
                  </button>
                </div>
              </div>

              <div className="study-set-list">
                {studySets.length === 0 ? (
                  <p className="empty-message">No study sets yet</p>
                ) : (
                  studySets.map((setItem) => (
                    <div
                      key={setItem.studyset_id}
                      className={`study-set-item ${selectedStudySet?.studyset_id === setItem.studyset_id ? 'active' : ''}`}
                      onClick={() => openStudySet(setItem)}
                    >
                      <div className="study-set-item-main">
                        <div className="study-set-title">{setItem.name}</div>
                        <div className="study-set-meta">
                          {setItem.source_scope} • {setItem.card_count} cards
                        </div>
                      </div>
                      <button
                        className="delete-btn"
                        title="Delete study set"
                        onClick={(e) => deleteStudySet(e, setItem.studyset_id)}
                      >×</button>
                    </div>
                  ))
                )}
              </div>
            </section>
            )}

            {courseTab === 'tracking' && (
            <section className="tracking-tab">
              <h2>Progress Tracking</h2>

              {/* Missed question patterns */}
              <div className="tracking-section">
                <h3 className="tracking-section-title tracking-section-toggle" onClick={() => toggleSection('missed')}>
                  <span>Missed Question Patterns</span>
                  <span className={`tracking-chevron${collapsedSections['missed'] ? ' collapsed' : ''}`}>▾</span>
                </h3>
                {!collapsedSections['missed'] && (missedFocusLoading ? (
                  <div className="study-help-text">Analyzing missed patterns...</div>
                ) : missedFocusAreas.length === 0 ? (
                  <div className="study-help-text">No patterns detected yet. Submit quizzes to identify weak areas from missed questions.</div>
                ) : (
                  <div className="missed-areas-list">
                    <div className="missed-selection-toolbar">
                      <span className="missed-selection-count">{selectedMissedChunkIds.length} section{selectedMissedChunkIds.length !== 1 ? 's' : ''} selected</span>
                      <button
                        className="focus-area-btn"
                        onClick={() => generateMissedFocusQuiz({
                          chunkIds: selectedMissedChunkIds,
                          title: 'Selected Missed Sections',
                          missCount: selectedMissedChunkIds.length + 2
                        })}
                        disabled={quizLoading || selectedMissedChunkIds.length === 0}
                      >
                        Practice Selected
                      </button>
                      <button
                        className="missed-clear-btn"
                        onClick={() => setSelectedMissedChunkIds([])}
                        disabled={selectedMissedChunkIds.length === 0}
                      >
                        Clear
                      </button>
                    </div>
                    {missedFocusAreas.slice(0, 5).map((area, idx) => (
                      <div key={area.doc_id || idx} className="missed-area-item">
                        <div className="missed-area-info">
                          <div className="missed-area-label">{area.label}</div>
                          <div className="missed-area-meta">
                            {area.miss_count} missed question{area.miss_count !== 1 ? 's' : ''} · {area.section_count || area.chunk_ids.length} content section{(area.section_count || area.chunk_ids.length) !== 1 ? 's' : ''}
                          </div>
                          {area.example_questions.length > 0 && (
                            <div className="missed-area-example">e.g. "{area.example_questions[0]}"</div>
                          )}
                          {(() => {
                            const areaSections = Array.isArray(area.sections) && area.sections.length > 0
                              ? area.sections
                              : (Array.isArray(area.chunk_ids) ? area.chunk_ids.map((chunkId, sectionIndex) => ({
                                  chunk_id: chunkId,
                                  miss_count: null,
                                  snippet: '',
                                  page_label: null,
                                  example_questions: [],
                                  section_index: sectionIndex + 1
                                })) : []);

                            if (areaSections.length === 0) return null;

                            return (
                            <div className="missed-section-list">
                              {areaSections.map((section) => {
                                const checked = selectedMissedChunkIds.includes(section.chunk_id);
                                return (
                                  <div key={section.chunk_id} className="missed-section-item">
                                    <label className="missed-section-check">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleMissedSectionSelection(section.chunk_id)}
                                      />
                                      <span>
                                        Section {section.page_label ? `(${section.page_label})` : `#${section.section_index || ''}`}
                                        {section.miss_count !== null && section.miss_count !== undefined
                                          ? ` · ${section.miss_count} miss${section.miss_count !== 1 ? 'es' : ''}`
                                          : ''}
                                      </span>
                                    </label>
                                    <div className="missed-section-snippet">{section.snippet || 'Snippet available after backend refresh.'}</div>
                                    {section.example_questions?.length > 0 && (
                                      <div className="missed-section-question">e.g. "{section.example_questions[0]}"</div>
                                    )}
                                    <button
                                      className="focus-area-btn"
                                      onClick={() => generateMissedFocusQuiz({
                                        chunkIds: [section.chunk_id],
                                        title: `${area.label} Section`,
                                        missCount: section.miss_count || 4
                                      })}
                                      disabled={quizLoading}
                                    >
                                      Practice Section
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            );
                          })()}
                        </div>
                        <button
                          className="focus-area-btn"
                          onClick={() => generateMissedFocusQuiz({
                            chunkIds: area.chunk_ids,
                            title: area.label,
                            missCount: area.miss_count
                          })}
                          disabled={quizLoading}
                        >
                          Practice All Sections
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Topic mastery */}
              <div className="tracking-section">
                <h3 className="tracking-section-title tracking-section-toggle" onClick={() => toggleSection('mastery')}>
                  <span>Topic Mastery</span>
                  <span className={`tracking-chevron${collapsedSections['mastery'] ? ' collapsed' : ''}`}>▾</span>
                </h3>
                {!collapsedSections['mastery'] && (improvementLoading ? (
                  <div className="study-help-text">Analyzing mastery...</div>
                ) : improvementAreas.length === 0 ? (
                  <div className="study-help-text">Submit quizzes to build topic mastery data.</div>
                ) : (
                  <>
                    <div className="tracking-mastery-summary">
                      {improvementAreas.filter(t => t.needs_improvement).length} of {improvementAreas.filter(t => !t.unassessed).length} topic{improvementAreas.filter(t => !t.unassessed).length !== 1 ? 's' : ''} need improvement&nbsp;·&nbsp;
                      avg mastery {formatScorePercent(improvementAreas.filter(t => !t.unassessed).length > 0 ? improvementAreas.filter(t => !t.unassessed).reduce((s, t) => s + t.mastery_score, 0) / improvementAreas.filter(t => !t.unassessed).length : 0)}
                    </div>
                    <div className="tracking-mastery-list">
                      {improvementAreas.map((topic) => (
                        <div key={topic.topic_id} className="mastery-bar-row">
                          <div className="mastery-bar-label">{topic.label}</div>
                          <div className="mastery-bar">
                            <div
                              className={`mastery-bar-fill severity-fill-${topic.severity}`}
                              style={{ width: `${Math.round(topic.mastery_score * 100)}%` }}
                            />
                          </div>
                          <div className="mastery-bar-pct">{topic.unassessed ? 'No quizzes' : formatScorePercent(topic.mastery_score)}</div>
                          <span className={`severity-badge severity-${topic.severity}`}>{topic.unassessed ? 'Unassessed' : topic.severity}</span>
                          {topic.needs_improvement && !topic.unassessed && (
                            <button
                              className="focus-area-btn"
                              onClick={() => { generateFocusQuiz(topic); }}
                              disabled={quizLoading}
                            >
                              Focus Quiz
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ))}
              </div>

              {/* Score summary */}
              <div className="tracking-section">
                <h3 className="tracking-section-title tracking-section-toggle" onClick={() => toggleSection('scoring')}>
                  <span>Scoring Overview</span>
                  <span className={`tracking-chevron${collapsedSections['scoring'] ? ' collapsed' : ''}`}>▾</span>
                </h3>
                {!collapsedSections['scoring'] && (!courseQuizMetrics ? (
                  <div className="study-help-text">Take a quiz to see scoring stats.</div>
                ) : (
                  <>
                    <div className="tracking-stat-grid">
                      <div className="tracking-stat-card">
                        <div className="tracking-stat-label">Total Attempts</div>
                        <div className="tracking-stat-value">{courseQuizMetrics.summary?.total_attempts ?? '—'}</div>
                      </div>
                      <div className="tracking-stat-card">
                        <div className="tracking-stat-label">Course Average</div>
                        <div className="tracking-stat-value">{formatScorePercent(courseQuizMetrics.summary?.average_score)}</div>
                      </div>
                      <div className="tracking-stat-card">
                        <div className="tracking-stat-label">Best Score</div>
                        <div className="tracking-stat-value">{formatScorePercent(courseQuizMetrics.summary?.best_score)}</div>
                      </div>
                      <div className="tracking-stat-card">
                        <div className="tracking-stat-label">Latest Score</div>
                        <div className="tracking-stat-value">{formatScorePercent(courseQuizMetrics.summary?.latest_score)}</div>
                      </div>
                    </div>
                    {Array.isArray(courseQuizMetrics.by_quiz) && courseQuizMetrics.by_quiz.length > 0 && (
                      <table className="tracking-table">
                        <thead>
                          <tr>
                            <th>Quiz</th>
                            <th>Attempts</th>
                            <th>Latest</th>
                            <th>Best</th>
                            <th>Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseQuizMetrics.by_quiz.map((row) => (
                            <tr key={row.quiz_id}>
                              <td>{row.quiz_name}</td>
                              <td>{row.total_attempts}</td>
                              <td>{formatScorePercent(row.latest_score)}</td>
                              <td>{formatScorePercent(row.best_score)}</td>
                              <td>{formatScorePercent(row.average_score)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                ))}
              </div>

              {/* Quiz attempts */}
              <div className="tracking-section">
                <h3 className="tracking-section-title tracking-section-toggle" onClick={() => toggleSection('attempts')}>
                  <span>Quiz Attempts</span>
                  <span className={`tracking-chevron${collapsedSections['attempts'] ? ' collapsed' : ''}`}>▾</span>
                </h3>
                {!collapsedSections['attempts'] && (courseQuizAttempts.length === 0 ? (
                  <div className="study-help-text">No quiz attempts yet.</div>
                ) : (
                  <table className="tracking-table">
                    <thead>
                      <tr>
                        <th>Quiz</th>
                        <th>Score</th>
                        <th>Correct</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseQuizAttempts.map((attempt) => (
                        <tr key={attempt.attempt_id}>
                          <td>{attempt.quiz_name || 'Quiz'}</td>
                          <td>{formatScorePercent(attempt.score)}</td>
                          <td>{attempt.correct_count}/{attempt.total_questions}</td>
                          <td>{attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString() : '—'}</td>
                          <td>
                            <button
                              className="quiz-history-open-btn"
                              onClick={() => { setCourseTab('quizzes'); openCourseAttemptDetail(attempt); }}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
              </div>
            </section>
            )}

            {courseTab === 'quizzes' && (
            <section className="study-section">
              <h2>Quizzes</h2>
              <div className="focus-areas-compact">
                {improvementAreas.length > 0 ? (
                  <button className="focus-areas-compact-link" onClick={() => setCourseTab('tracking')}>
                    {improvementAreas.length} area{improvementAreas.length !== 1 ? 's' : ''} to improve — view in Tracking →
                  </button>
                ) : (
                  <span className="focus-areas-compact-none">No weak topics detected yet. Keep practicing!</span>
                )}
              </div>

              <div className="study-controls">
                <div className="study-control-row">
                  <select
                    value={quizSourceType}
                    onChange={(e) => {
                      setQuizSourceType(e.target.value);
                      setQuizSourceId('');
                      setQuizSourceIds([]);
                    }}
                    className="study-input"
                  >
                    <option value="document">Document Source</option>
                    <option value="topic">Topic Source</option>
                  </select>

                  {quizSourceType === 'topic' ? (
                    <select
                      value={quizSourceId}
                      onChange={(e) => setQuizSourceId(e.target.value)}
                      className="study-input"
                    >
                      <option value="">Select topic from this course</option>
                      {topics.map((item) => (
                        <option key={item.topic_id} value={item.topic_id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="study-doc-selector">
                      {documents.length === 0 ? (
                        <div className="study-help-text">Upload documents to enable quiz generation.</div>
                      ) : (
                        documents.map((doc) => (
                          <label key={doc.doc_id} className="study-doc-option">
                            <input
                              type="checkbox"
                              checked={quizSourceIds.includes(doc.doc_id)}
                              onChange={() => toggleQuizDocument(doc.doc_id)}
                            />
                            <span>{doc.title}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {quizSourceType === 'topic' && topics.length === 0 && (
                  <div className="study-topic-empty">
                    <span className="study-help-text">No topics in this course yet.</span>
                    <button onClick={autoDetectTopics} disabled={quizLoading} className="study-generate-btn">
                      {quizLoading ? 'Detecting...' : 'Auto-detect Topics'}
                    </button>
                  </div>
                )}

                <div className="quiz-type-row">
                  <label className="quiz-type-chip">
                    <input
                      type="checkbox"
                      checked={quizTypes.includes('multiple_choice')}
                      onChange={() => toggleQuizType('multiple_choice')}
                    />
                    <span>Multiple Choice</span>
                  </label>
                  <label className="quiz-type-chip">
                    <input
                      type="checkbox"
                      checked={quizTypes.includes('true_false')}
                      onChange={() => toggleQuizType('true_false')}
                    />
                    <span>True/False</span>
                  </label>
                  <label className="quiz-type-chip">
                    <input
                      type="checkbox"
                      checked={quizTypes.includes('short_answer')}
                      onChange={() => toggleQuizType('short_answer')}
                    />
                    <span>Short Answer</span>
                  </label>
                </div>

                <div className="study-control-row">
                  <input
                    type="text"
                    placeholder="Quiz name (optional)"
                    value={quizName}
                    onChange={(e) => setQuizName(e.target.value)}
                    className="study-input"
                  />
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={quizQuestionCount}
                    onChange={(e) => setQuizQuestionCount(Number(e.target.value) || 10)}
                    className="study-input study-count-input"
                  />
                  <button
                    onClick={generateQuiz}
                    disabled={
                      quizLoading ||
                      quizTypes.length === 0 ||
                      (quizSourceType === 'document' && quizSourceIds.length === 0) ||
                      (quizSourceType === 'topic' && !quizSourceId)
                    }
                    className="study-generate-btn"
                  >
                    {quizLoading ? 'Generating...' : 'Generate Quiz'}
                  </button>
                </div>
              </div>

              <div className="study-set-list">
                {quizzes.length === 0 ? (
                  <p className="empty-message">No quizzes yet</p>
                ) : (
                  quizzes.map((quizItem) => (
                    <div
                      key={quizItem.quiz_id}
                      className={`study-set-item ${selectedQuiz?.quiz_id === quizItem.quiz_id ? 'active' : ''}`}
                      onClick={() => openQuiz(quizItem)}
                    >
                      <div className="study-set-item-main">
                        <div className="study-set-title">{quizItem.name}</div>
                        <div className="study-set-meta">
                          {quizItem.mode} • {quizItem.question_count} questions
                        </div>
                      </div>
                      <button
                        className="delete-btn"
                        title="Delete quiz"
                        onClick={(e) => deleteQuiz(e, quizItem.quiz_id)}
                      >×</button>
                    </div>
                  ))
                )}
              </div>
            </section>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <h2>Select a Course</h2>
            <p>Choose a course from the sidebar to view its materials</p>
          </div>
        )}
      </div>
      </div>

      {selectedDocument && (
        <div className="viewer-panel">
          <div className="viewer-header">
            <h2>{documentContent?.title || selectedDocument.title}</h2>
            <button className="close-viewer" onClick={closeViewer}>×</button>
          </div>
          <div className="viewer-content">
            {loadingDoc ? (
              <div className="loading-doc">Loading document...</div>
            ) : documentContent ? (
              documentContent.is_html ? (
                <div className="document-html" dangerouslySetInnerHTML={{ __html: documentContent.content }} />
              ) : (
                <pre className="document-text">
                  {highlightText && documentContent.content.includes(highlightText) ? (
                    <>
                      {documentContent.content.split(highlightText).map((part, idx, arr) => (
                        <span key={idx}>
                          {part}
                          {idx < arr.length - 1 && (
                            <mark className="chunk-highlight">{highlightText}</mark>
                          )}
                        </span>
                      ))}
                    </>
                  ) : (
                    documentContent.content
                  )}
                </pre>
              )
            ) : null}
          </div>
        </div>
      )}

      {selectedStudySet && (
        <div className="flashcard-panel">
          <div className="viewer-header">
            <h2>{selectedStudySet.name}</h2>
            <button className="close-viewer" onClick={closeStudySet}>×</button>
          </div>
          <div className="viewer-content">
            {flashcards.length === 0 ? (
              <div className="loading-doc">Loading flashcards...</div>
            ) : (
              <div className="flashcard-wrap">
                <div className={`flashcard ${flashcardFlipped ? 'flipped' : ''}`}>
                  <div className="flashcard-face flashcard-front">
                    <div className="flashcard-label">Front</div>
                    <div className="flashcard-text">{selectedFlashcard?.front}</div>
                  </div>
                  <div className="flashcard-face flashcard-back">
                    <div className="flashcard-label">Back</div>
                    <div className="flashcard-text">{selectedFlashcard?.back}</div>
                  </div>
                </div>

                <div className="flashcard-controls">
                  <button onClick={previousFlashcard} disabled={flashcardIndex === 0}>Previous</button>
                  <button onClick={() => setFlashcardFlipped(!flashcardFlipped)}>Flip</button>
                  <button onClick={nextFlashcard} disabled={flashcardIndex >= flashcards.length - 1}>Next</button>
                </div>
                <div className="flashcard-counter">{flashcardIndex + 1} / {flashcards.length}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedQuiz && (
        <div className="flashcard-panel">
          <div className="viewer-header">
            <h2>{selectedQuiz.name}</h2>
            <button className="close-viewer" onClick={closeQuiz}>×</button>
          </div>
          <div className="viewer-content">
            {quizLoading ? (
              <div className="loading-doc">Loading quiz...</div>
            ) : quizQuestions.length === 0 ? (
              <div className="loading-doc">No questions available.</div>
            ) : (
              <div className="quiz-wrap">
                <div className="quiz-metrics-grid">
                  <div className="quiz-metric-card">
                    <div className="quiz-metric-label">Latest</div>
                    <div className="quiz-metric-value">{formatScorePercent(quizMetrics?.summary?.latest_score)}</div>
                  </div>
                  <div className="quiz-metric-card">
                    <div className="quiz-metric-label">Best</div>
                    <div className="quiz-metric-value">{formatScorePercent(quizMetrics?.summary?.best_score)}</div>
                  </div>
                  <div className="quiz-metric-card">
                    <div className="quiz-metric-label">First → Latest</div>
                    <div className="quiz-metric-value">
                      {quizMetrics?.summary?.improvement_from_first === null || quizMetrics?.summary?.improvement_from_first === undefined
                        ? '—'
                        : `${quizMetrics.summary.improvement_from_first >= 0 ? '+' : ''}${Math.round(quizMetrics.summary.improvement_from_first * 100)} pts`}
                    </div>
                  </div>
                  <div className="quiz-metric-card">
                    <div className="quiz-metric-label">Recent Trend</div>
                    <div className="quiz-metric-value">
                      {quizMetrics?.summary?.recent_trend === null || quizMetrics?.summary?.recent_trend === undefined
                        ? '—'
                        : `${quizMetrics.summary.recent_trend >= 0 ? '+' : ''}${Math.round(quizMetrics.summary.recent_trend * 100)} pts`}
                    </div>
                  </div>
                  <div className="quiz-metric-card">
                    <div className="quiz-metric-label">Course Avg</div>
                    <div className="quiz-metric-value">{formatScorePercent(courseQuizMetrics?.summary?.average_score)}</div>
                  </div>
                </div>

                <div className="quiz-history-header">
                  <div className="quiz-history-scope">
                    <button
                      className={`quiz-history-scope-btn ${quizHistoryScope === 'quiz' ? 'active' : ''}`}
                      onClick={() => setQuizHistoryScope('quiz')}
                    >
                      This Quiz
                    </button>
                    <button
                      className={`quiz-history-scope-btn ${quizHistoryScope === 'course' ? 'active' : ''}`}
                      onClick={() => setQuizHistoryScope('course')}
                    >
                      Course-wide
                    </button>
                  </div>
                  <button onClick={retakeSelectedQuiz} className="quiz-retake-btn">Retake</button>
                </div>

                <div className="quiz-history-list">
                  {quizInsightsLoading ? (
                    <div className="study-help-text">Loading history and metrics...</div>
                  ) : historyItems.length === 0 ? (
                    <div className="study-help-text">No attempts yet.</div>
                  ) : (
                    historyItems.slice(0, 8).map((attempt) => (
                      <div key={attempt.attempt_id} className="quiz-history-item">
                        <div>
                          <div className="quiz-history-score">{formatScorePercent(attempt.score)}</div>
                          <div className="quiz-history-meta">
                            {quizHistoryScope === 'course' ? `${attempt.quiz_name || 'Quiz'} • ` : ''}
                            {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : 'In progress'}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            quizHistoryScope === 'course'
                              ? openCourseAttemptDetail(attempt)
                              : loadQuizAttemptDetail(selectedQuiz.quiz_id, attempt.attempt_id)
                          }
                          className="quiz-history-open-btn"
                        >
                          Review
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {!quizResults ? (
                  <>
                    <div className="quiz-question-card">
                      <div className="quiz-question-meta">
                        Question {quizQuestionIndex + 1} / {quizQuestions.length} • {currentQuizQuestion?.type?.replace('_', ' ')}
                      </div>
                      <div className="quiz-question-text">{currentQuizQuestion?.question_text}</div>

                      {currentQuizQuestion?.type === 'short_answer' ? (
                        <textarea
                          className="quiz-short-input"
                          value={quizAnswers[currentQuizQuestion.question_id] || ''}
                          onChange={(e) => setQuizAnswer(currentQuizQuestion.question_id, e.target.value)}
                          placeholder="Type your answer"
                        />
                      ) : (
                        <div className="quiz-options">
                          {(currentQuizQuestion?.choices || []).map((choice, idx) => (
                            <label key={`${currentQuizQuestion.question_id}-${idx}`} className="quiz-option">
                              <input
                                type="radio"
                                name={`q-${currentQuizQuestion.question_id}`}
                                value={choice}
                                checked={(quizAnswers[currentQuizQuestion.question_id] || '') === choice}
                                onChange={(e) => setQuizAnswer(currentQuizQuestion.question_id, e.target.value)}
                              />
                              <span>{choice}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flashcard-controls">
                      <button
                        onClick={() => setQuizQuestionIndex((idx) => Math.max(0, idx - 1))}
                        disabled={quizQuestionIndex === 0}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setQuizQuestionIndex((idx) => Math.min(quizQuestions.length - 1, idx + 1))}
                        disabled={quizQuestionIndex >= quizQuestions.length - 1}
                      >
                        Next
                      </button>
                      <button onClick={submitQuiz} disabled={quizSubmitting}>
                        {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="quiz-results">
                    <h3>
                      Score: {Math.round((quizResults.score || 0) * 100)}% ({quizResults.correct_count}/{quizResults.total_questions})
                    </h3>
                    <div className="quiz-results-list">
                      {(quizResults.graded_responses || []).map((result) => (
                        <div key={result.question_id} className={`quiz-result-item ${result.is_correct ? 'correct' : 'incorrect'}`}>
                          <div className="quiz-result-question">{result.question_text}</div>
                          <div className="quiz-result-line">Your answer: {result.user_answer || '—'}</div>
                          <div className="quiz-result-line">Correct answer: {result.correct_answer}</div>
                          <div className="quiz-result-line">Feedback: {result.feedback}</div>
                          {(result.source_chunks || []).length > 0 && (
                            <div className="quiz-review-sources">
                              {(result.source_chunks || []).map((source) => (
                                <div key={`${result.question_id}-${source.chunk_id}`} className="quiz-review-source">
                                  <button
                                    className="quiz-review-link"
                                    onClick={() => openCitationDocument(source)}
                                  >
                                    {source.doc_title}{source.page_label ? ` (${source.page_label})` : ''}
                                  </button>
                                  <div className="quiz-review-snippet">{source.snippet}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
