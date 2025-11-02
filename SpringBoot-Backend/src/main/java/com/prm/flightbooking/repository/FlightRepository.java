package com.prm.flightbooking.repository;

import com.prm.flightbooking.entity.Flight;
import com.prm.flightbooking.entity.Flight.FlightStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FlightRepository extends JpaRepository<Flight, Long> {
    
    List<Flight> findByStatus(FlightStatus status);
    
    @Query("SELECT f FROM Flight f WHERE f.departureAirport.id = :departureId AND f.arrivalAirport.id = :arrivalId AND f.departureTime >= :departureDate")
    List<Flight> findFlightsByRouteAndDate(@Param("departureId") Long departureId, 
                                          @Param("arrivalId") Long arrivalId, 
                                          @Param("departureDate") LocalDateTime departureDate);
    
    @Query("SELECT f FROM Flight f WHERE f.departureAirport.id = :departureId AND f.arrivalAirport.id = :arrivalId AND f.departureTime BETWEEN :startDate AND :endDate")
    List<Flight> findFlightsByRouteAndDateRange(@Param("departureId") Long departureId, 
                                               @Param("arrivalId") Long arrivalId, 
                                               @Param("startDate") LocalDateTime startDate,
                                               @Param("endDate") LocalDateTime endDate);
    
    List<Flight> findByAirlineId(Long airlineId);
    
    List<Flight> findByAircraftTypeId(Long aircraftTypeId);
    
    @Query("SELECT f FROM Flight f WHERE f.availableSeats > 0 AND f.status = 'SCHEDULED'")
    List<Flight> findAvailableFlights();
    
    @Query("SELECT f FROM Flight f WHERE f.departureTime < :currentTime AND f.status = 'SCHEDULED'")
    List<Flight> findOverdueFlights(@Param("currentTime") LocalDateTime currentTime);
}
