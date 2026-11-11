import type { LocationNode, Vec2 } from '../types';

export const locations: LocationNode[] = [
  { id: 'lake', nameEn: 'Dhanmondi Lake Gate', nameBn: 'ধানমন্ডি লেক গেট', x: -165, z: 120, kind: 'pickup' },
  { id: 'hospital', nameEn: 'Shapla General Hospital', nameBn: 'শাপলা জেনারেল হাসপাতাল', x: 160, z: 135, kind: 'landmark' },
  { id: 'banani', nameEn: 'Banani Market', nameBn: 'বনানী মার্কেট', x: 145, z: -130, kind: 'pickup' },
  { id: 'gulshan', nameEn: 'Gulshan Circle', nameBn: 'গুলশান সার্কেল', x: 20, z: -180, kind: 'pickup' },
  { id: 'farmgate', nameEn: 'Farmgate Hub', nameBn: 'ফার্মগেট হাব', x: -25, z: 20, kind: 'landmark' },
  { id: 'campus', nameEn: 'Nagar University', nameBn: 'নগর বিশ্ববিদ্যালয়', x: -145, z: -85, kind: 'pickup' },
  { id: 'airport', nameEn: 'Airport Link', nameBn: 'এয়ারপোর্ট লিংক', x: 20, z: -245, kind: 'landmark' },
  { id: 'badda', nameEn: 'Badda Link Road', nameBn: 'বাড্ডা লিংক রোড', x: 225, z: 25, kind: 'pickup' },
  { id: 'station', nameEn: 'Green Line Terminal', nameBn: 'গ্রিন লাইন টার্মিনাল', x: -215, z: 10, kind: 'pickup' },
  { id: 'hotel', nameEn: 'Meghna Hotel', nameBn: 'মেঘনা হোটেল', x: 105, z: 210, kind: 'pickup' },
  { id: 'fuel', nameEn: 'Padma Fuel', nameBn: 'পদ্মা ফুয়েল', x: -70, z: -205, kind: 'service' },
  { id: 'fuel-east', nameEn: 'Meghna Filling Station', nameBn: 'মেঘনা ফিলিং স্টেশন', x: 225, z: 142, kind: 'service' },
  { id: 'garage', nameEn: 'Nagar Auto Care', nameBn: 'নগর অটো কেয়ার', x: 210, z: -75, kind: 'service' },
];

export const roadLoop: Vec2[] = [
  { x: -230, z: -190 }, { x: 220, z: -190 }, { x: 230, z: 190 }, { x: -220, z: 200 }, { x: -230, z: -190 },
];

export const passengerTypes = ['Student', 'Business traveler', 'Family', 'Tourist', 'Regular rider', 'VIP guest'];

export function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
