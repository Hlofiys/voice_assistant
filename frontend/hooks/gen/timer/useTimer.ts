import { useState, useRef } from "react";

// Определим тип для хука таймера
export interface TimerHook {
  time: string;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  totalMilliseconds: number;
}

export const useTimer = (): TimerHook => {
  const [time, setTime] = useState("00:00:000"); // Инициализируем состояние времени
  const [totalMilliseconds, setTotalMilliseconds] = useState<number>(0);
//   const countRef = useRef<NodeJS.Timeout | null>(null); // Референс для интервала таймераэ
  const countRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null); // Время начала
  const pausedTimeRef = useRef<number>(0); // Время, проведенное в паузе

  // Функция для форматирования времени
  const formatTime = (milliseconds: number): string => {
    const pad = (num: number, size: number): string => {
      let s = String(num);
      while (s.length < size) s = "0" + s;
      return s;
    };

    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    const millis = milliseconds % 1000;
    return `${pad(minutes, 2)}:${pad(seconds, 2)}:${pad(millis, 3)}`;
  };

  // Функция для запуска таймера
  const startTimer = (): void => {
    if (countRef.current) return; // Если таймер уже работает, ничего не делаем

    startTimeRef.current = Date.now() - pausedTimeRef.current; // Учитываем время с паузы
    countRef.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTimeRef.current!;
      setTime(formatTime(elapsedTime));
      setTotalMilliseconds(elapsedTime);
    }, 10);
  };

  // Функция для приостановки таймера
  const pauseTimer = (): void => {
    if (countRef.current) {
      clearInterval(countRef.current); // Останавливаем интервал
      countRef.current = null; // Сбрасываем референс интервала
      pausedTimeRef.current = totalMilliseconds; // Запоминаем прошедшее время
    }
  };

  // Функция для продолжения таймера после паузы
  const resumeTimer = (): void => {
    if (!countRef.current && pausedTimeRef.current > 0) {
      startTimer(); // Запускаем таймер заново
    }
  };

  // Функция для сброса таймера
  const resetTimer = (): void => {
    if (countRef.current) {
      clearInterval(countRef.current); // Останавливаем интервал
      countRef.current = null;
    }
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    setTotalMilliseconds(0);
    setTime("00:00:000");
  };

  return {
    time,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    totalMilliseconds,
  };
};
