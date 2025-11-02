package com.prm.flightbooking.service;

import com.prm.flightbooking.entity.Booking;
import com.prm.flightbooking.entity.Booking.BookingStatus;
import com.prm.flightbooking.entity.Booking.PaymentStatus;
import com.prm.flightbooking.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookingService {
    
    @Autowired
    private BookingRepository bookingRepository;
    
    public List<Booking> findAll() {
        return bookingRepository.findAll();
    }
    
    public Optional<Booking> findById(Long id) {
        return bookingRepository.findById(id);
    }
    
    public Optional<Booking> findByBookingNumber(String bookingNumber) {
        return bookingRepository.findByBookingNumber(bookingNumber);
    }
    
    public Booking createBooking(Booking booking) {
        // Generate unique booking number
        String bookingNumber = "BK" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        booking.setBookingNumber(bookingNumber);
        return bookingRepository.save(booking);
    }
    
    public Booking updateBooking(Booking booking) {
        return bookingRepository.save(booking);
    }
    
    public void deleteBooking(Long id) {
        bookingRepository.deleteById(id);
    }
    
    public List<Booking> findByUserId(Long userId) {
        return bookingRepository.findByUserId(userId);
    }
    
    public List<Booking> findByFlightId(Long flightId) {
        return bookingRepository.findByFlightId(flightId);
    }
    
    public List<Booking> findByStatus(BookingStatus status) {
        return bookingRepository.findByStatus(status);
    }
    
    public List<Booking> findByPaymentStatus(PaymentStatus paymentStatus) {
        return bookingRepository.findByPaymentStatus(paymentStatus);
    }
    
    public List<Booking> findByUserIdAndStatus(Long userId, BookingStatus status) {
        return bookingRepository.findByUserIdAndStatus(userId, status);
    }
    
    public List<Booking> findByBookingDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return bookingRepository.findByBookingDateRange(startDate, endDate);
    }
    
    public Booking updateBookingStatus(Long bookingId, BookingStatus status) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        booking.setStatus(status);
        return bookingRepository.save(booking);
    }
    
    public Booking updatePaymentStatus(Long bookingId, PaymentStatus paymentStatus) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        booking.setPaymentStatus(paymentStatus);
        return bookingRepository.save(booking);
    }
    
    public Long countConfirmedBookingsByFlightId(Long flightId) {
        return bookingRepository.countConfirmedBookingsByFlightId(flightId);
    }
}
