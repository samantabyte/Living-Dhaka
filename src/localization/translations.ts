import type { Language } from '../types';

const en = {
  title: 'LIVING DHAKA', tagline: 'Drive the city. Build your future.', newCareer: 'New career', continue: 'Continue',
  garage: 'Garage', wallet: 'Wallet', settings: 'Settings', credits: 'Credits', multiplayer: 'Multiplayer',
  drive: 'Drive', pause: 'Paused', resume: 'Resume', menu: 'Main menu', accept: 'Accept ride', reject: 'Reject',
  pickup: 'Pickup', destination: 'Destination', fare: 'Fare', eta: 'ETA', speed: 'SPEED', fuel: 'FUEL',
  health: 'HEALTH', balance: 'BALANCE', reputation: 'REPUTATION', rideComplete: 'Ride complete', close: 'Close',
  refill: 'Refill fuel', repair: 'Repair vehicle', engineUpgrade: 'Engine upgrade', brakeUpgrade: 'Brake upgrade',
  insufficient: 'Not enough balance', language: 'Language', quality: 'Graphics quality', reducedShake: 'Reduced camera shake',
  audio: 'Master volume', controls: 'WASD drive · Space handbrake · R recover to road · C camera · M map · Esc pause',
  createRoom: 'Create private room', joinRoom: 'Join room', roomCode: 'Room code', playerName: 'Player name',
  rainy: 'MONSOON', clear: 'CLEAR', connected: 'Connected', offline: 'Offline', objective: 'OBJECTIVE',
  fictional: 'A fictionalized, compressed interpretation of Dhaka. No real brands or map data are used.',
};

const bn: typeof en = {
  title: 'লিভিং ঢাকা', tagline: 'শহর চালান। ভবিষ্যৎ গড়ুন।', newCareer: 'নতুন ক্যারিয়ার', continue: 'চালিয়ে যান',
  garage: 'গ্যারেজ', wallet: 'ওয়ালেট', settings: 'সেটিংস', credits: 'ক্রেডিট', multiplayer: 'মাল্টিপ্লেয়ার',
  drive: 'ড্রাইভ', pause: 'বিরতি', resume: 'আবার শুরু', menu: 'মূল মেনু', accept: 'রাইড নিন', reject: 'বাদ দিন',
  pickup: 'পিকআপ', destination: 'গন্তব্য', fare: 'ভাড়া', eta: 'সময়', speed: 'গতি', fuel: 'জ্বালানি',
  health: 'গাড়ির অবস্থা', balance: 'ব্যালেন্স', reputation: 'সুনাম', rideComplete: 'রাইড সম্পন্ন', close: 'বন্ধ',
  refill: 'জ্বালানি নিন', repair: 'গাড়ি মেরামত', engineUpgrade: 'ইঞ্জিন আপগ্রেড', brakeUpgrade: 'ব্রেক আপগ্রেড',
  insufficient: 'পর্যাপ্ত টাকা নেই', language: 'ভাষা', quality: 'গ্রাফিক্স মান', reducedShake: 'ক্যামেরা ঝাঁকুনি কম',
  audio: 'মূল ভলিউম', controls: 'WASD গাড়ি · Space হ্যান্ডব্রেক · R রাস্তায় ফিরুন · C ক্যামেরা · M ম্যাপ · Esc বিরতি',
  createRoom: 'প্রাইভেট রুম তৈরি', joinRoom: 'রুমে যোগ দিন', roomCode: 'রুম কোড', playerName: 'খেলোয়াড়ের নাম',
  rainy: 'বর্ষা', clear: 'পরিষ্কার', connected: 'সংযুক্ত', offline: 'অফলাইন', objective: 'লক্ষ্য',
  fictional: 'এটি ঢাকার একটি কাল্পনিক ও সংক্ষিপ্ত রূপ। কোনো বাস্তব ব্র্যান্ড বা মানচিত্রের তথ্য ব্যবহৃত হয়নি।',
};

export type TranslationKey = keyof typeof en;
export const translations = { en, bn };
export const t = (language: Language, key: TranslationKey) => translations[language][key];
