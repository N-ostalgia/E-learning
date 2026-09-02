"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faPlus,
  faTimes,
  faLocationDot,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  isFullDay: boolean;
  location: string | null;
  color: string;
  creator: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
}

interface CalendarViewProps {
  communityId: string;
  canManage: boolean;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

export function CalendarView({ communityId, canManage }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month, daysInMonth, 23, 59, 59);

  const { data: events, isLoading, isError, refetch } = trpc.event.list.useQuery({
    communityId,
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  const createMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      toast.success("Event created");
      refetch();
      setShowEventModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.event.update.useMutation({
    onSuccess: () => {
      toast.success("Event updated");
      refetch();
      setShowEventModal(false);
      setEditingEvent(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.event.delete.useMutation({
    onSuccess: () => {
      toast.success("Event deleted");
      refetch();
      setShowEventModal(false);
      setEditingEvent(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const eventsByDate = new Map<string, Event[]>();
  events?.forEach((event) => {
    const key = formatDateKey(new Date(event.startDate));
    if (!eventsByDate.has(key)) {
      eventsByDate.set(key, []);
    }
    // Ensure color is string
    const ev: Event = {
      ...event,
      color: event.color || "#10b981",
    };
    eventsByDate.get(key)!.push(ev);
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    setSelectedDate(clickedDate);
    if (canManage) {
      setEditingEvent(null);
      setShowEventModal(true);
    }
  };

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleDeleteEvent = () => {
    if (editingEvent && confirm("Delete this event?")) {
      deleteMutation.mutate({ eventId: editingEvent.id });
    }
  };

  const calendarDays = [];
  const totalSlots = 42;

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push({ day: 0, empty: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, empty: false });
  }
  while (calendarDays.length < totalSlots) {
    calendarDays.push({ day: 0, empty: true });
  }

  const EventModal = () => {
    const [title, setTitle] = useState(editingEvent?.title || "");
    const [description, setDescription] = useState(editingEvent?.description || "");
    const [startDate, setStartDate] = useState(
      editingEvent?.startDate
        ? new Date(editingEvent.startDate).toISOString().slice(0, 16)
        : selectedDate
        ? new Date(selectedDate).toISOString().slice(0, 16)
        : ""
    );
    const [endDate, setEndDate] = useState(
      editingEvent?.endDate
        ? new Date(editingEvent.endDate).toISOString().slice(0, 16)
        : ""
    );
    const [isFullDay, setIsFullDay] = useState(editingEvent?.isFullDay ?? false);
    const [location, setLocation] = useState(editingEvent?.location || "");
    const [color, setColor] = useState(editingEvent?.color || "#10b981");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        toast.error("Title is required");
        return;
      }
      if (!startDate) {
        toast.error("Start date is required");
        return;
      }
      if (endDate && new Date(endDate) < new Date(startDate)) {
        toast.error("Event end must be after its start");
        return;
      }

      const payload = {
        communityId,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        isFullDay,
        location: location.trim() || undefined,
        color,
      };

      if (editingEvent) {
        updateMutation.mutate({ eventId: editingEvent.id, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
              {editingEvent ? "Edit Event" : "New Event"}
            </h3>
            <button
              onClick={() => {
                setShowEventModal(false);
                setEditingEvent(null);
              }}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                placeholder="Event title"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                placeholder="Event description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                  Start *
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                  End (optional)
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={isFullDay}
                  onChange={(e) => setIsFullDay(e.target.checked)}
                  className="accent-[var(--color-accent)]"
                />
                Full day
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                placeholder="Location (optional)"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingEvent
                  ? "Update"
                  : "Create"}
              </button>
              {editingEvent && (
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  };

  const getEventsForDay = (day: number) => {
    const date = new Date(year, month, day);
    const key = formatDateKey(date);
    return eventsByDate.get(key) || [];
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
          </button>
          <span className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            {new Date(year, month).toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={handleNextMonth}
            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
          >
            <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
          </button>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowEventModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
            Add Event
          </button>
        )}
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-text-secondary)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-lg bg-[var(--color-border)]" />
          ))}
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load events.</p>
          <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-[var(--color-accent)] hover:underline">
            Try again
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && !isError && (
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((item, idx) => {
          if (item.empty) {
            return <div key={idx} className="aspect-square rounded-lg p-1" />;
          }

          const dayEvents = getEventsForDay(item.day);
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={idx}
              onClick={() => handleDateClick(item.day)}
              className="group relative aspect-square cursor-pointer rounded-lg border border-[var(--color-border)] p-1 transition-colors hover:bg-[var(--color-bg)]"
            >
              <div className="flex h-full flex-col items-start justify-between">
                <span
                  className={`text-sm font-medium ${
                    new Date(year, month, item.day).toDateString() ===
                    new Date().toDateString()
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {item.day}
                </span>
                {hasEvents && (
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="h-1.5 w-3 rounded-full"
                        style={{ backgroundColor: ev.color || "#10b981" }}
                        title={ev.title}
                        onClick={(e) => handleEventClick(ev, e)}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-[var(--color-text-secondary)]">
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Events list for selected date */}
      {selectedDate && (
        <div className="mt-6 border-t border-[var(--color-border)] pt-4">
          <h4 className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">
            {selectedDate.toLocaleDateString("default", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h4>
          {getEventsForDay(selectedDate.getDate()).length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No events on this day</p>
          ) : (
            <div className="space-y-2">
              {getEventsForDay(selectedDate.getDate()).map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ev.color || "#10b981" }}
                    />
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {ev.title}
                    </span>
                    {ev.isFullDay && (
                      <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-border)] px-2 py-0.5 rounded-full">
                        All day
                      </span>
                    )}
                  </div>
                  {ev.description && (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {ev.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]">
                    {ev.location && (
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3" />
                        {ev.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                      {new Date(ev.startDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {ev.endDate &&
                        ` - ${new Date(ev.endDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                    </span>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => {
                        setEditingEvent(ev);
                        setShowEventModal(true);
                      }}
                      className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && <EventModal />}
    </div>
  );
}