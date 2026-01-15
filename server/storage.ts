import { 
  users, 
  aiRequests, 
  projects, 
  conceptRatings,
  type User, 
  type InsertUser, 
  type AiRequest, 
  type InsertAiRequest,
  type Project,
  type InsertProject,
  type ConceptRating,
  type InsertConceptRating
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAiRequest(request: InsertAiRequest): Promise<AiRequest>;
  getAiRequests(): Promise<AiRequest[]>;
  
  // Project management
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjects(userId?: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Concept ratings
  createConceptRating(rating: InsertConceptRating): Promise<ConceptRating>;
  getConceptRatings(projectId: string): Promise<ConceptRating[]>;
  getConceptRating(projectId: string, conceptId: string, userId?: string): Promise<ConceptRating | undefined>;
  updateConceptRating(id: number, rating: "more_like_this" | "less_like_this"): Promise<ConceptRating | undefined>;
  deleteConceptRating(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private aiRequests: Map<number, AiRequest>;
  private projects: Map<string, Project>;
  private conceptRatings: Map<number, ConceptRating>;
  private currentUserId: number;
  private currentRequestId: number;
  private currentRatingId: number;

  constructor() {
    this.users = new Map();
    this.aiRequests = new Map();
    this.projects = new Map();
    this.conceptRatings = new Map();
    this.currentUserId = 1;
    this.currentRequestId = 1;
    this.currentRatingId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password
    };
    this.users.set(id, user);
    return user;
  }

  async createAiRequest(insertRequest: InsertAiRequest): Promise<AiRequest> {
    const id = this.currentRequestId++;
    const request: AiRequest = { 
      id,
      query: insertRequest.query,
      tone: insertRequest.tone,
      response: insertRequest.response,
      tokens: insertRequest.tokens,
      processingTime: insertRequest.processingTime,
      createdAt: new Date() 
    };
    this.aiRequests.set(id, request);
    return request;
  }

  async getAiRequests(): Promise<AiRequest[]> {
    return Array.from(this.aiRequests.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Project management methods
  async createProject(insertProject: InsertProject): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: insertProject.id,
      name: insertProject.name,
      description: insertProject.description || null,
      userId: insertProject.userId || null,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(project.id, project);
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(userId?: string): Promise<Project[]> {
    const allProjects = Array.from(this.projects.values());
    if (userId) {
      return allProjects.filter(project => project.userId === userId);
    }
    return allProjects;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;

    const updatedProject: Project = {
      ...existingProject,
      ...updates,
      updatedAt: new Date()
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Concept rating methods
  async createConceptRating(insertRating: InsertConceptRating): Promise<ConceptRating> {
    const id = this.currentRatingId++;
    const rating: ConceptRating = {
      id,
      projectId: insertRating.projectId,
      conceptId: insertRating.conceptId,
      rhetoricalDevice: insertRating.rhetoricalDevice,
      tone: insertRating.tone,
      rating: insertRating.rating,
      userId: insertRating.userId || null,
      createdAt: new Date()
    };
    this.conceptRatings.set(id, rating);
    return rating;
  }

  async getConceptRatings(projectId: string): Promise<ConceptRating[]> {
    return Array.from(this.conceptRatings.values())
      .filter(rating => rating.projectId === projectId);
  }

  async getConceptRating(projectId: string, conceptId: string, userId?: string): Promise<ConceptRating | undefined> {
    return Array.from(this.conceptRatings.values())
      .find(rating => 
        rating.projectId === projectId && 
        rating.conceptId === conceptId && 
        (!userId || rating.userId === userId)
      );
  }

  async updateConceptRating(id: number, newRating: "more_like_this" | "less_like_this"): Promise<ConceptRating | undefined> {
    const existingRating = this.conceptRatings.get(id);
    if (!existingRating) return undefined;

    const updatedRating: ConceptRating = {
      ...existingRating,
      rating: newRating
    };
    this.conceptRatings.set(id, updatedRating);
    return updatedRating;
  }

  async deleteConceptRating(id: number): Promise<boolean> {
    return this.conceptRatings.delete(id);
  }
}

export const storage = new MemStorage();
