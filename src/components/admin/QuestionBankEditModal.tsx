import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, AlertTriangle, Info } from "lucide-react";
import { DEPARTMENTS, CATEGORIES, SENIORITY_LEVELS, ROLE_DNA_DIMENSIONS } from "@/lib/questionBank";

interface QuestionItem {
  question: {
    id: string;
    department: string;
    category: string;
    seniority: string;
    question_text: string;
    intent: string | null;
    role_dna_dimension: string;
    difficulty: string;
    nd_safe: boolean;
  };
  rubric: {
    what_good_looks_like: string[];
    followup_probes: string[];
    bias_traps_to_avoid: string[];
    notes_for_interviewer: string | null;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: QuestionItem | null;
  onSave: (question: any, rubric: any) => void;
}

const BANNED_WORDS = ['accent', 'age', 'gender', 'religion', 'ethnicity', 'disability', 'iq', 'race', 'nationality'];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function QuestionBankEditModal({ open, onOpenChange, item, onSave }: Props) {
  const isEdit = !!item;
  
  // Question fields
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [seniority, setSeniority] = useState("");
  const [roleDnaDimension, setRoleDnaDimension] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [ndSafe, setNdSafe] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [intent, setIntent] = useState("");
  
  // Rubric fields
  const [whatGoodLooksLike, setWhatGoodLooksLike] = useState<string[]>([""]);
  const [followupProbes, setFollowupProbes] = useState<string[]>([""]);
  const [biasTraps, setBiasTraps] = useState<string[]>([""]);
  const [notesForInterviewer, setNotesForInterviewer] = useState("");
  
  // Validation
  const [errors, setErrors] = useState<string[]>([]);
  const [bannedWordWarning, setBannedWordWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setDepartment(item.question.department);
      setCategory(item.question.category);
      setSeniority(item.question.seniority);
      setRoleDnaDimension(item.question.role_dna_dimension);
      setDifficulty(item.question.difficulty);
      setNdSafe(item.question.nd_safe);
      setQuestionText(item.question.question_text);
      setIntent(item.question.intent || "");
      
      if (item.rubric) {
        setWhatGoodLooksLike(item.rubric.what_good_looks_like.length ? item.rubric.what_good_looks_like : [""]);
        setFollowupProbes(item.rubric.followup_probes.length ? item.rubric.followup_probes : [""]);
        setBiasTraps(item.rubric.bias_traps_to_avoid.length ? item.rubric.bias_traps_to_avoid : [""]);
        setNotesForInterviewer(item.rubric.notes_for_interviewer || "");
      } else {
        resetRubric();
      }
    } else {
      resetForm();
    }
  }, [item, open]);

  const resetRubric = () => {
    setWhatGoodLooksLike([""]);
    setFollowupProbes([""]);
    setBiasTraps([""]);
    setNotesForInterviewer("");
  };

  const resetForm = () => {
    setDepartment("");
    setCategory("");
    setSeniority("");
    setRoleDnaDimension("");
    setDifficulty("medium");
    setNdSafe(false);
    setQuestionText("");
    setIntent("");
    resetRubric();
    setErrors([]);
    setBannedWordWarning(false);
  };

  // Check for banned words in rubric
  useEffect(() => {
    const allText = [
      ...whatGoodLooksLike,
      ...followupProbes,
      ...biasTraps,
      notesForInterviewer
    ].join(' ').toLowerCase();
    
    const hasBanned = BANNED_WORDS.some(word => allText.includes(word));
    setBannedWordWarning(hasBanned);
  }, [whatGoodLooksLike, followupProbes, biasTraps, notesForInterviewer]);

  const validate = (): boolean => {
    const newErrors: string[] = [];
    
    if (!questionText.trim()) newErrors.push("Question text is required");
    if (!department) newErrors.push("Department is required");
    if (!category) newErrors.push("Category is required");
    if (!seniority) newErrors.push("Seniority is required");
    if (!roleDnaDimension) newErrors.push("Role DNA dimension is required");
    
    const validWGL = whatGoodLooksLike.filter(s => s.trim());
    if (validWGL.length < 2) {
      newErrors.push("At least 2 'What good looks like' items required");
    }
    
    const validBias = biasTraps.filter(s => s.trim());
    if (validBias.length < 1) {
      newErrors.push("At least 1 bias trap required");
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      const questionData = {
        department,
        category,
        seniority,
        role_dna_dimension: roleDnaDimension,
        difficulty,
        nd_safe: ndSafe,
        question_text: questionText.trim(),
        intent: intent.trim() || null,
      };
      
      const rubricData = {
        what_good_looks_like: whatGoodLooksLike.filter(s => s.trim()),
        followup_probes: followupProbes.filter(s => s.trim()),
        bias_traps_to_avoid: biasTraps.filter(s => s.trim()),
        notes_for_interviewer: notesForInterviewer.trim() || null,
      };
      
      await onSave(questionData, rubricData);
    } finally {
      setSaving(false);
    }
  };

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ""]);
  };

  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const updateListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((item, i) => i === index ? value : item));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEdit ? 'Edit Question' : 'New Question'}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <div className="space-y-6 pb-4">
            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Question Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Question Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Seniority *</Label>
                  <Select value={seniority} onValueChange={setSeniority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select seniority" />
                    </SelectTrigger>
                    <SelectContent>
                      {SENIORITY_LEVELS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Role DNA Dimension *</Label>
                  <Select value={roleDnaDimension} onValueChange={setRoleDnaDimension}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dimension" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_DNA_DIMENSIONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <Switch id="nd-safe" checked={ndSafe} onCheckedChange={setNdSafe} />
                  <Label htmlFor="nd-safe">ND-safe question</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question Text *</Label>
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the interview question..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Intent</Label>
                <Textarea
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="What is this question designed to uncover?"
                  rows={2}
                />
              </div>
            </div>

            {/* Rubric Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-foreground">Answer Rubric</h3>
              
              {/* ND-safe guidance */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>ND-safe guidelines:</strong> Write observable signals, not personality judgments. 
                  Avoid "confident", "charismatic". Prefer "explains tradeoffs clearly".
                </AlertDescription>
              </Alert>

              {/* Banned word warning */}
              {bannedWordWarning && (
                <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please avoid protected attributes (age, gender, ethnicity, etc.). 
                    Keep rubrics job-relevant and observable.
                  </AlertDescription>
                </Alert>
              )}

              {/* What good looks like */}
              <div className="space-y-2">
                <Label>What Good Looks Like (min 2) *</Label>
                <p className="text-xs text-muted-foreground">Observable behaviors that indicate a strong answer</p>
                {whatGoodLooksLike.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateListItem(setWhatGoodLooksLike, i, e.target.value)}
                      placeholder="e.g., Explains tradeoffs with specific examples"
                    />
                    {whatGoodLooksLike.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeListItem(setWhatGoodLooksLike, i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addListItem(setWhatGoodLooksLike)}>
                  <Plus className="h-4 w-4 mr-1" /> Add item
                </Button>
              </div>

              {/* Follow-up probes */}
              <div className="space-y-2">
                <Label>Follow-up Probes</Label>
                <p className="text-xs text-muted-foreground">Questions to dig deeper</p>
                {followupProbes.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateListItem(setFollowupProbes, i, e.target.value)}
                      placeholder="e.g., Can you walk me through your decision-making process?"
                    />
                    {followupProbes.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeListItem(setFollowupProbes, i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addListItem(setFollowupProbes)}>
                  <Plus className="h-4 w-4 mr-1" /> Add item
                </Button>
              </div>

              {/* Bias traps */}
              <div className="space-y-2">
                <Label>Bias Traps to Avoid (min 1) *</Label>
                <p className="text-xs text-muted-foreground">Help interviewers avoid unfair judgments</p>
                {biasTraps.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateListItem(setBiasTraps, i, e.target.value)}
                      placeholder="e.g., Don't conflate introversion with lack of leadership"
                    />
                    {biasTraps.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeListItem(setBiasTraps, i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addListItem(setBiasTraps)}>
                  <Plus className="h-4 w-4 mr-1" /> Add item
                </Button>
              </div>

              {/* Notes for interviewer */}
              <div className="space-y-2">
                <Label>Notes for Interviewer</Label>
                <Textarea
                  value={notesForInterviewer}
                  onChange={(e) => setNotesForInterviewer(e.target.value)}
                  placeholder="Any additional guidance for the interviewer..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
