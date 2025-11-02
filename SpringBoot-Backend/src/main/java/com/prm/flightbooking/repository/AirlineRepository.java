package com.prm.flightbooking.repository;

import com.prm.flightbooking.entity.Airline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AirlineRepository extends JpaRepository<Airline, Long> {
    
    Optional<Airline> findByCode(String code);
    
    List<Airline> findByNameContainingIgnoreCase(String name);
    
    List<Airline> findByCountry(String country);
    
    @Query("SELECT a FROM Airline a WHERE a.name LIKE %:searchTerm% OR a.code LIKE %:searchTerm%")
    List<Airline> searchByNameOrCode(@Param("searchTerm") String searchTerm);
}
