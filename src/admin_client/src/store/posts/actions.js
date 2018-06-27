import firebase from 'firebase/app';
import 'firebase/database';
import {
  SET_POST,
  PUBLISHED_EVENTS,
  DRAFT_EVENTS,
  POST_DIALOG_DELETE,
  DELETE_POST,
  POST_ID
} from '../types';

const getPublishedEvents = ({ dispatch }) => {
  const publishedEventsRef = firebase
    .database()
    .ref('/posts/events')
    .orderByChild('status')
    .equalTo('published');
  publishedEventsRef.on('value', snapshot => {
    dispatch(PUBLISHED_EVENTS, snapshot);
  });
};

const setPublishedEvents = ({ commit }, payload) => {
  const arr = [];
  commit(PUBLISHED_EVENTS, []);
  payload.forEach(snap => {
    arr.push({ ...snap.val(), key: snap.key });
  });
  commit(PUBLISHED_EVENTS, arr);
};

const getDraftEvents = ({ dispatch }) => {
  const draftEventsRef = firebase
    .database()
    .ref('/posts/events')
    .orderByChild('status')
    .equalTo('draft');
  draftEventsRef.on('value', snapshot => {
    dispatch(DRAFT_EVENTS, snapshot);
  });
};

const setDraftEvents = ({ commit }, payload) => {
  const arr = [];
  commit(DRAFT_EVENTS, []);
  payload.forEach(snap => {
    arr.push({ ...snap.val(), key: snap.key });
  });
  commit(DRAFT_EVENTS, arr);
};

const getEventBy = async ({ commit }, payload) => {
  const eventRef = firebase.database().ref('/posts/events/' + payload);
  const snapshot = await eventRef.once('value');
  commit(SET_POST, snapshot.val());
};

const deletePost = ({ dispatch, commit, getters }) => {
  dispatch(DELETE_POST, getters[POST_ID]);
  commit(POST_DIALOG_DELETE, { dialogDelete: false });
  commit(POST_ID, null);
};

export default {
  getPublishedEvents,
  getDraftEvents,
  getEventBy,
  setPublishedEvents,
  setDraftEvents,
  deletePost
};
