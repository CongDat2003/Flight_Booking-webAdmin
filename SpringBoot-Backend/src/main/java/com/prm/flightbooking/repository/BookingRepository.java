package com.prm.flightbooking.repository;

import com.prm.flightbooking.entity.Booking;
import com.prm.flightbooking.entity.Booking.BookingStatus;
import com.prm.flightbooking.entity.Booking.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    
    List<Booking> findByUserId(Long userId);
    
    List<Booking> findByFlightId(Long flightId);
    
    List<Booking> findByStatus(BookingStatus status);
    
    List<Booking> findByPaymentStatus(PaymentStatus paymentStatus);
    
    Optional<Booking> findByBookingNumber(String bookingNumber);
    
    @Query("SELECT b FROM Booking b WHERE b.user.id = :userId AND b.status = :status")
    List<Booking> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") BookingStatus status);
    
    @Query("SELECT b FROM Booking b WHERE b.bookingDate BETWEEN :startDate AND :endDate")
    List<Booking> findByBookingDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.flight.id = :flightId AND b.status = 'CONFIRMED'")
    Long countConfirmedBookingsByFlightId(@Param("flightId") Long flightId);
}
