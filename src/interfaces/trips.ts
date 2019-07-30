export interface IAddTripArgs {
  trip: ITrip;
}

export interface ICouponCode {
  id: string;
  code: string;
  discountType: string;
  discountAmount: number;
  appliesToNumberOfGuests: number;
  appliesToExcursions: boolean;
}

export interface ITripRoomPrice {
  id: string;
  role: string;
  pricePerRoom: number;
  pricePerRoomPerPerson: number;
  downPayment: number;
  downPaymentPerPerson: number;
  addOnPricePerNight: number;
  extraPricePerNightPerPerson: number;
}

export interface IDailyTripAgenda {
  day: number;
  dayTitle: string;
  imageUrl: string;
  agenda: string[];
}

export interface ITripExcursionTime {
  id: string;
  start: Date;
  end: Date;
  price: number;
  cost?: number;
}

export interface ITripExcursionDate {
  id: string;
  tripDateId: string;
  day: Date;
  times: ITripExcursionTime[];
}

export interface ITripExcursion {
  id: string;
  description: string;
  imageUrl: string;
  included?: string;
  price?: string;
  restrictions?: string;
  times: string;
  what: string;
  whatType: 'TOUR';
  when: string;
  dates: ITripExcursionDate[];
}

export interface ITripImage {
  type: 'Background' | 'Primary' | 'Gallery' | 'Property' | 'Room' | 'Header' | 'Footer' | 'Promotional';
  url: string;
  displayOrder?: number;
}

export interface ITripLocation {
  cityOrRegion: string;
  country: string;
  description?: string;
  images?: ITripImage[];
}

export interface ITripRoomClass {
  id: string;
  description: string;
  rooms: number;
  roomsRemaining: number;
  images: ITripImage[];
  roomPriceBasis: string;
  pricing: ITripRoomPrice[];
}

export interface ITripHotel {
  description: string;
  images: ITripImage[];
  rooms: ITripRoomClass[];
  property: string;
  totalRooms: number;
  totalRoomsRemaining: number;
}

export interface ITripDate {
  id: string;
  days: number;
  end: Date;
  start: Date;
  status: 'Planning' | 'Active' | 'Completed' | 'No Availability';
}

export interface ITrip {
  agenda: IDailyTripAgenda[];
  couponCodes?: ICouponCode[];
  createdAt?: Date;
  dates: ITripDate[];
  description?: string;
  excursions?: ITripExcursion[];
  hotel: ITripHotel;
  id?: string;
  location: ITripLocation;
  includes: string[];
  images: ITripImage[];
  title: string;
  updatedAt?: Date;
  urlSlug?: string[];
  videoUrl?: string;
}
