package com.prm.flightbooking.repository;

import com.prm.flightbooking.entity.Seat;
import com.prm.flightbooking.entity.Seat.SeatClass;
import com.prm.flightbooking.entity.Seat.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    
    List<Seat> findByFlightId(Long flightId);
    
    List<Seat> findByFlightIdAndSeatClass(Long flightId, SeatClass seatClass);
    
    List<Seat> findByFlightIdAndStatus(Long flightId, SeatStatus status);
    
    @Query("SELECT s FROM Seat s WHERE s.flight.id = :flightId AND s.status = 'AVAILABLE'")
    List<Seat> findAvailableSeatsByFlightId(@Param("flightId") Long flightId);
    
    @Query("SELECT s FROM Seat s WHERE s.flight.id = :flightId AND s.seatClass = :seatClass AND s.status = 'AVAILABLE'")
    List<Seat> findAvailableSeatsByFlightIdAndClass(@Param("flightId") Long flightId, @Param("seatClass") SeatClass seatClass);
    
    @Query("SELECT COUNT(s) FROM Seat s WHERE s.flight.id = :flightId AND s.status = 'AVAILABLE'")
    Long countAvailableSeatsByFlightId(@Param("flightId") Long flightId);
}
