import axios from 'axios';

const API_URL = '/api/hangs/';

const getConfig = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

// ========== BUCKET LIST ==========

const getBucketItems = async (token) => {
  const response = await axios.get(API_URL + 'bucket', getConfig(token));
  return response.data;
};

const createBucketItem = async (title, token) => {
  const response = await axios.post(API_URL + 'bucket', { title }, getConfig(token));
  return response.data;
};

const toggleImIn = async (itemId, token) => {
  const response = await axios.put(API_URL + 'bucket/' + itemId + '/imin', {}, getConfig(token));
  return response.data;
};

const deleteBucketItem = async (itemId, token) => {
  const response = await axios.delete(API_URL + 'bucket/' + itemId, getConfig(token));
  return response.data;
};

// ========== POLLS ==========

const getPolls = async (token) => {
  const response = await axios.get(API_URL + 'polls', getConfig(token));
  return response.data;
};

const createPoll = async (pollData, token) => {
  const response = await axios.post(API_URL + 'polls', pollData, getConfig(token));
  return response.data;
};

const votePoll = async (pollId, optionIndex, token) => {
  const response = await axios.put(API_URL + 'polls/' + pollId + '/vote', { optionIndex }, getConfig(token));
  return response.data;
};

const deletePoll = async (pollId, token) => {
  const response = await axios.delete(API_URL + 'polls/' + pollId, getConfig(token));
  return response.data;
};

// ========== LEDGER ==========

const getBills = async (token) => {
  const response = await axios.get(API_URL + 'bills', getConfig(token));
  return response.data;
};

const addBill = async (billData, token) => {
  const response = await axios.post(API_URL + 'bills', billData, getConfig(token));
  return response.data;
};

const settleBill = async (billId, token) => {
  const response = await axios.put(API_URL + 'bills/' + billId + '/settle', {}, getConfig(token));
  return response.data;
};

const deleteBill = async (billId, token) => {
  const response = await axios.delete(API_URL + 'bills/' + billId, getConfig(token));
  return response.data;
};

// ========== DTR ==========

const getDTR = async (token) => {
  const response = await axios.get(API_URL + 'dtr', getConfig(token));
  return response.data;
};

const clockIn = async (notes, token) => {
  const response = await axios.post(API_URL + 'dtr/clock-in', { notes }, getConfig(token));
  return response.data;
};

const clockOut = async (token) => {
  const response = await axios.post(API_URL + 'dtr/clock-out', {}, getConfig(token));
  return response.data;
};

const addManualEntry = async (entryData, token) => {
  const response = await axios.post(API_URL + 'dtr/entry', entryData, getConfig(token));
  return response.data;
};

const deleteEntry = async (entryId, token) => {
  const response = await axios.delete(API_URL + 'dtr/entry/' + entryId, getConfig(token));
  return response.data;
};

const updateTarget = async (targetHours, token) => {
  const response = await axios.put(API_URL + 'dtr/target', { targetHours }, getConfig(token));
  return response.data;
};

const updateInitialHours = async (initialHours, token) => {
  const response = await axios.put(API_URL + 'dtr/initial-hours', { initialHours }, getConfig(token));
  return response.data;
};

const hangsService = {
  getBucketItems, createBucketItem, toggleImIn, deleteBucketItem,
  getPolls, createPoll, votePoll, deletePoll,
  getBills, addBill, settleBill, deleteBill,
  getDTR, clockIn, clockOut, addManualEntry, deleteEntry, updateTarget, updateInitialHours
};

export default hangsService;
