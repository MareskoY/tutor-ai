'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useUserPreference } from '@/components/context/user-preference-context';

// Языки и соответствующие страны
const LANGUAGES = {
  English: ['USA', 'UK', 'Canada', 'Australia'],
  Spanish: ['Spain', 'Mexico', 'Argentina', 'Colombia'],
  French: ['France', 'Belgium', 'Switzerland', 'Canada'],
  German: ['Germany', 'Austria', 'Switzerland'],
  Russian: ['Russia', 'Belarus', 'Kazakhstan', 'Ukraine'],
} as const;

type LanguageKey = keyof typeof LANGUAGES;

export function StudentSettings() {
  const { studentPreference, updateStudentPreference, isLoading } =
    useUserPreference();

  console.log('studentPreference', studentPreference);

  // Local state
  const [name, setName] = React.useState(studentPreference.name);
  const [age, setAge] = React.useState(String(studentPreference.age));
  const [language, setLanguage] = React.useState<LanguageKey>(
    studentPreference.language as LanguageKey,
  );
  const [country, setCountry] = React.useState(studentPreference.country);
  const [grade, setGrade] = React.useState(studentPreference.grade);
  const [programType, setProgramType] = React.useState(
    studentPreference['school-program'],
  );

  const [saveStatus, setSaveStatus] = React.useState<
    'Save' | 'Saving...' | 'Saved'
  >('Saved');

  // Получаем список стран для выбранного языка
  const availableCountries: string[] = React.useMemo(() => {
    return LANGUAGES[language] ? [...LANGUAGES[language]] : [];
  }, [language]);

  // Обновляем `country`, если поменялся `language`
  React.useEffect(() => {
    if (!availableCountries.includes(country)) {
      setCountry(availableCountries[0] || '');
    }
  }, [language, country, availableCountries]);

  React.useEffect(() => {
    setName(studentPreference.name);
    setAge(String(studentPreference.age));
    setLanguage(studentPreference.language as LanguageKey);
    setCountry(studentPreference.country);
    setGrade(studentPreference.grade);
    setProgramType(studentPreference['school-program']);
    setSaveStatus('Saved'); // После загрузки данных ставим состояние "Saved"
  }, [studentPreference]);

  const isDirty = React.useMemo(() => {
    const hasChanges =
      name !== studentPreference.name ||
      age !== String(studentPreference.age) ||
      language !== studentPreference.language ||
      country !== studentPreference.country ||
      grade !== studentPreference.grade ||
      programType !== studentPreference['school-program'];

    if (hasChanges) {
      setSaveStatus('Save'); // Если данные изменены, кнопка возвращается к "Save"
    }

    return hasChanges;
  }, [name, age, language, country, grade, programType, studentPreference]);

  const handleSaveAll = async () => {
    setSaveStatus('Saving...');
    const updatedPreferences = {
      ...studentPreference,
      name,
      age, // `age` теперь строка, чтобы соответствовать `StudentPreference`
      language,
      country,
      grade,
      'school-program': programType,
    };

    await updateStudentPreference(updatedPreferences);
    setSaveStatus('Saved');
  };

  // ✅ Показываем лоадер, если `studentPreference` еще не загружен
  if (isLoading) {
    return (
      <Card className="border border-gray-200 rounded-2xl flex items-center justify-center h-[400px]">
        <LoadingSpinner />
      </Card>
    );
  }

  return (
      <Card className="border border-gray-200 rounded-2xl">
        <CardHeader>
          <CardTitle>Student Settings</CardTitle>
          <CardDescription>
            Provide basic information about the student
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              <div className="flex flex-col">
                <label htmlFor="name" className="text-sm font-semibold">
                  Name
                </label>
                <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Language - Select */}
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Language</span>
                <Select
                    value={language}
                    onValueChange={(value) => setLanguage(value as LanguageKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(LANGUAGES).map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="grade" className="text-sm font-semibold">
                  Class / Grade
                </label>
                <Input
                    id="grade"
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="flex flex-col">
                <label htmlFor="age" className="text-sm font-semibold">
                  Age
                </label>
                <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                />
              </div>


              {/* Country - Select */}
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Country</span>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCountries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <label htmlFor="program-type" className="text-sm font-semibold">
                  Program Type
                </label>
                <Input
                    id="program-type"
                    type="text"
                    value={programType}
                    onChange={(e) => setProgramType(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={!isDirty}>
            {saveStatus}
          </Button>
        </CardFooter>
      </Card>
  );
}
