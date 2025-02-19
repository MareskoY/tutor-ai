// app/context/UserPreferenceContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

export interface StudentPreference {
  name: string;
  age: string;
  language: string;
  country: string;
  grade: string;
  'school-program': string;
  'chats-preferences': Record<string, any>; // keys are chat types (e.g., 'default', 'math', etc.)
}

// Default empty student preference object
const defaultStudentPreference: StudentPreference = {
  name: '',
  age: '',
  language: '',
  country: '',
  grade: '',
  'school-program': '',
  'chats-preferences': {},
};

interface UserPreferenceContextType {
  studentPreference: StudentPreference;
  refreshStudentPreference: () => void;
  updateStudentPreference: (prefs: StudentPreference) => Promise<void>;
  isLoading: boolean;
}

const UserPreferenceContext = createContext<
  UserPreferenceContextType | undefined
>(undefined);

export const UserPreferenceProvider = ({
  children,
}: { children: ReactNode }) => {
  const [studentPreference, setStudentPreference] = useState<StudentPreference>(
    defaultStudentPreference,
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudentPreference = async () => {
    try {
      const res = await fetch('/api/user');
      const data = await res.json();

      // Если данных нет, устанавливаем пустой объект, чтобы избежать `null`
      setStudentPreference(data.studentPreference || defaultStudentPreference);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch student preference', error);
    }
  };

  useEffect(() => {
    fetchStudentPreference();
  }, []);

  const refreshStudentPreference = () => {
    fetchStudentPreference();
  };

  const updateStudentPreference = async (prefs: StudentPreference) => {
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentPreference: prefs }),
      });
      if (res.ok) {
        refreshStudentPreference();
      }
    } catch (error) {
      console.error('Failed to update student preference', error);
    }
  };

  return (
    <UserPreferenceContext.Provider
      value={{
        studentPreference,
        refreshStudentPreference,
        updateStudentPreference,
        isLoading,
      }}
    >
      {children}
    </UserPreferenceContext.Provider>
  );
};

export const useUserPreference = () => {
  const context = useContext(UserPreferenceContext);
  if (!context) {
    throw new Error(
      'useUserPreference must be used within a UserPreferenceProvider',
    );
  }
  return context;
};
