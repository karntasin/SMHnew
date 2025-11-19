<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;

class RoomBookingController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/rooms/List');
    }

    public function calendar()
    {
        // Return events for FullCalendar
        return response()->json([]);
    }

    public function meetingRooms()
    {
        // Return list of meeting rooms
        return response()->json([]);
    }

    public function myBookings()
    {
        return Inertia::render('admin/rooms/List');
    }

    public function store(Request $request)
    {
        // TODO: Implement booking creation
        return back();
    }

    public function show($id)
    {
        return Inertia::render('admin/rooms/Show', ['id' => $id]);
    }

    public function update(Request $request, $id)
    {
        // TODO: Implement booking update
        return back();
    }

    public function approve($id)
    {
        // TODO: Implement booking approval
        return back();
    }

    public function destroy($id)
    {
        // TODO: Implement booking deletion
        return back();
    }
}
